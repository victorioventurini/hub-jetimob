import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutboxItem {
  id: string;
  bu_id: string | null;
  user_id: string;
  event_slug: string;
  channel_slug: string;
  payload: Record<string, unknown>;
  status: string;
  retries: number;
  max_retries: number;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
}

interface SlackConfig {
  webhook_url?: string;
  bot_token?: string;
  default_channel_id?: string;
  default_channel_name?: string;
  configured?: boolean;
}

interface WebhookConfig {
  url?: string;
  http_method?: string;
  secret_header_name?: string;
  secret_header_value?: string;
  configured?: boolean;
}

interface TemplateResolution {
  template_id: string;
  version_id: string;
  subject: string | null;
  body: string;
  variables_used: string[];
  is_bu_override: boolean;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Get integration API key from hub_integrations_global_config
async function getIntegrationApiKey(
  supabase: SupabaseClient,
  integrationKey: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[Outbox] ${integrationKey} integration not available`);
    return null;
  }

  const row = data as { config_encrypted: { api_key?: string } | null; is_enabled_global: boolean };
  if (!row.is_enabled_global) {
    console.warn(`[Outbox] ${integrationKey} integration not enabled`);
    return null;
  }

  return row.config_encrypted?.api_key || null;
}

// Get BU channel configuration
async function getBuChannelConfig<T>(
  supabase: SupabaseClient,
  buId: string,
  channelSlug: string
): Promise<T | null> {
  const { data, error } = await supabase
    .from("bu_notification_channels")
    .select("config, is_enabled")
    .eq("bu_id", buId)
    .eq("channel_slug", channelSlug)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[Outbox] BU channel config not found for ${channelSlug}`);
    return null;
  }

  const row = data as { config: T; is_enabled: boolean };
  if (!row.is_enabled) {
    console.warn(`[Outbox] Channel ${channelSlug} is disabled for BU ${buId}`);
    return null;
  }

  return row.config;
}

// Send email via SendGrid
async function sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<void> {
  console.log(`[Outbox] Sending email to ${options.to} via SendGrid`);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }], subject: options.subject }],
      from: options.from || { email: "no-reply@hub.jetimob.com", name: "Hub" },
      content: [{ type: "text/html", value: options.html }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }
}

// Send email via Resend (fallback)
async function sendViaResend(options: EmailOptions, apiKey: string): Promise<void> {
  console.log(`[Outbox] Sending email to ${options.to} via Resend`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: options.from ? `${options.from.name} <${options.from.email}>` : "Hub <onboarding@resend.dev>",
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${response.status} - ${errorText}`);
  }
}

// Send email using available provider
async function sendEmail(
  supabase: SupabaseClient,
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> {
  // Try SendGrid first
  try {
    const sendgridKey = await getIntegrationApiKey(supabase, "sendgrid");
    if (sendgridKey) {
      await sendViaSendGrid(options, sendgridKey);
      return { success: true };
    }
  } catch (error: unknown) {
    console.error("[Outbox] SendGrid failed:", error instanceof Error ? error.message : error);
  }

  // Fallback to Resend
  try {
    const resendKey = await getIntegrationApiKey(supabase, "resend");
    if (resendKey) {
      await sendViaResend(options, resendKey);
      return { success: true };
    }
  } catch (error: unknown) {
    console.error("[Outbox] Resend failed:", error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }

  return { success: false, error: "No email provider configured" };
}

// Send via Slack
async function sendSlack(
  config: SlackConfig,
  payload: Record<string, unknown>,
  item: OutboxItem
): Promise<{ success: boolean; error?: string }> {
  const title = (payload.title as string) || "Nova Notificação";
  const message = (payload.message as string) || "";
  const contextUrl = payload.context_url as string | undefined;
  const siteUrl = Deno.env.get("SITE_URL") || "https://hub.jetimob.com";
  
  console.log(`[Outbox] Sending Slack notification for outbox_id=${item.id}`);

  // Slack Incoming Webhook mode
  if (config.webhook_url) {
    const slackPayload = {
      text: `*${title}*\n${message}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: title, emoji: true }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: message }
        },
        ...(contextUrl ? [{
          type: "section",
          text: { type: "mrkdwn", text: `<${siteUrl}${contextUrl}|Ver no Hub>` }
        }] : [])
      ]
    };

    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Sanitize: do not log the webhook URL
      return { success: false, error: `Slack webhook error: ${response.status} - ${errorText.slice(0, 100)}` };
    }

    return { success: true };
  }

  // Slack Bot Token mode (chat.postMessage)
  if (config.bot_token && (config.default_channel_id || config.default_channel_name)) {
    const channel = config.default_channel_id || config.default_channel_name;
    
    const slackPayload = {
      channel,
      text: `*${title}*\n${message}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: title, emoji: true }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: message }
        },
        ...(contextUrl ? [{
          type: "section",
          text: { type: "mrkdwn", text: `<${siteUrl}${contextUrl}|Ver no Hub>` }
        }] : [])
      ]
    };

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bot_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    });

    const result = await response.json();
    
    if (!result.ok) {
      // Sanitize: do not log the token
      return { success: false, error: `Slack API error: ${result.error || "unknown"}` };
    }

    return { success: true };
  }

  return { success: false, error: "Slack not configured (missing webhook_url or bot_token+channel)" };
}

// Send via Webhook
async function sendWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>,
  item: OutboxItem
): Promise<{ success: boolean; error?: string }> {
  if (!config.url) {
    return { success: false, error: "Webhook URL not configured" };
  }

  const siteUrl = Deno.env.get("SITE_URL") || "https://hub.jetimob.com";
  const contextUrl = payload.context_url as string | undefined;
  
  console.log(`[Outbox] Sending webhook for outbox_id=${item.id}`);

  // Build sanitized payload (no internal IDs or sensitive data)
  const webhookPayload = {
    event_slug: item.event_slug,
    bu_id: item.bu_id,
    title: payload.title,
    message: payload.message,
    context_type: payload.context_type,
    context_id: payload.context_id,
    context_url: contextUrl ? `${siteUrl}${contextUrl}` : null,
    severity: payload.severity,
    sent_at: new Date().toISOString(),
    // Exclude internal metadata, user_id, etc.
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add secret header if configured
  if (config.secret_header_name && config.secret_header_value) {
    headers[config.secret_header_name] = config.secret_header_value;
  }

  const method = config.http_method?.toUpperCase() || "POST";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(config.url, {
      method,
      headers,
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      // Sanitize: do not log the full URL (might contain tokens)
      return { success: false, error: `Webhook error: ${response.status} - ${errorText.slice(0, 100)}` };
    }

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Webhook timeout (30s)" };
    }
    return { success: false, error: `Webhook error: ${error instanceof Error ? error.message : "unknown"}` };
  }
}

// Resolve notification template from database
async function resolveTemplate(
  supabase: SupabaseClient,
  eventSlug: string,
  channel: string,
  buId: string | null
): Promise<TemplateResolution | null> {
  const { data, error } = await supabase.rpc("resolve_notification_template", {
    p_event_slug: eventSlug,
    p_channel: channel,
    p_bu_id: buId,
  });

  if (error || !data || data.length === 0) {
    console.log(`[Outbox] No template found for ${eventSlug}/${channel}, using fallback`);
    return null;
  }

  return data[0] as TemplateResolution;
}

// Render template variables
function renderTemplate(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value ?? ""));
  }
  // Remove any unresolved placeholders
  result = result.replace(/\{\{\w+\}\}/g, "");
  return result;
}

// Convert markdown to simple HTML (basic conversion for email)
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(.+)$/, "<p>$1</p>");
}

// Build notification email HTML from template
function buildNotificationEmailHtmlFromTemplate(
  subject: string,
  body: string,
  contextUrl: string | undefined
): string {
  const siteUrl = Deno.env.get("SITE_URL") || "https://hub.jetimob.com";
  const bodyHtml = markdownToHtml(body);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Hub</h1>
        </div>
        
        <h2 style="color: #18181b; font-size: 18px; margin-bottom: 16px;">${subject}</h2>
        
        <div style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          ${bodyHtml}
        </div>
        
        ${contextUrl ? `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${siteUrl}${contextUrl}" style="display: inline-block; background-color: #379eff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver no Hub
          </a>
        </div>
        ` : ""}
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          O ponto de encontro para evoluir, executar e simplificar o morar.
        </p>
      </div>
    </body>
    </html>
  `;
}

// Build fallback notification email HTML (when no template exists)
function buildFallbackEmailHtml(payload: Record<string, unknown>): string {
  const title = (payload.title as string) || "Nova Notificação";
  const message = (payload.message as string) || "";
  const contextUrl = payload.context_url as string | undefined;
  return buildNotificationEmailHtmlFromTemplate(title, message, contextUrl);
}

// Process a single outbox item
async function processOutboxItem(
  supabase: SupabaseClient,
  item: OutboxItem
): Promise<{ success: boolean; error?: string }> {
  const { channel_slug, payload, user_id, bu_id } = item;

  // Use canonical resolver for recipient info
  // This ensures we always use work_email with fallback to auth.users.email
  const { data: recipientData, error: recipientError } = await supabase.rpc(
    "resolve_notification_recipient",
    { p_auth_user_id: user_id }
  );

  const recipient = recipientData as {
    profile_id: string | null;
    display_name: string;
    work_email: string | null;
    has_profile: boolean;
  } | null;

  switch (channel_slug) {
    case "email": {
      if (recipientError || !recipient?.work_email) {
        return { 
          success: false, 
          error: "NO_WORK_EMAIL: Recipient has no work_email and no auth email fallback" 
        };
      }
      
      // Build variables for template rendering
      const templateVars: Record<string, unknown> = {
        ...payload,
        user_name: recipient.display_name || "Usuário",
        context_url: payload.context_url,
      };
      
      // Try to resolve template from database
      const template = await resolveTemplate(supabase, item.event_slug, "email", bu_id);
      
      let subject: string;
      let html: string;
      
      if (template) {
        // Render template with variables
        subject = renderTemplate(template.subject || "{{title}}", templateVars);
        const renderedBody = renderTemplate(template.body, templateVars);
        html = buildNotificationEmailHtmlFromTemplate(subject, renderedBody, payload.context_url as string | undefined);
        console.log(`[Outbox] Using template version_id=${template.version_id} for ${item.event_slug}/email`);
      } else {
        // Fallback to hardcoded minimal template
        subject = `[Hub] ${(payload.title as string) || "Nova Notificação"}`;
        html = buildFallbackEmailHtml(payload);
        console.log(`[Outbox] Using fallback template for ${item.event_slug}/email`);
      }
      
      return await sendEmail(supabase, {
        to: recipient.work_email,
        subject,
        html,
      });
    }

    case "slack": {
      if (!bu_id) {
        return { success: false, error: "BU ID required for Slack" };
      }
      const slackConfig = await getBuChannelConfig<SlackConfig>(supabase, bu_id, "slack");
      if (!slackConfig) {
        return { success: false, error: "Slack channel not configured or disabled" };
      }
      if (!slackConfig.configured && !slackConfig.webhook_url && !slackConfig.bot_token) {
        return { success: false, error: "Slack not configured (missing credentials)" };
      }
      return await sendSlack(slackConfig, payload, item);
    }

    case "webhook": {
      if (!bu_id) {
        return { success: false, error: "BU ID required for Webhook" };
      }
      const webhookConfig = await getBuChannelConfig<WebhookConfig>(supabase, bu_id, "webhook");
      if (!webhookConfig) {
        return { success: false, error: "Webhook channel not configured or disabled" };
      }
      if (!webhookConfig.url) {
        return { success: false, error: "Webhook URL not configured" };
      }
      return await sendWebhook(webhookConfig, payload, item);
    }

    case "whatsapp": {
      // WhatsApp is explicitly out of scope for Phase 3
      console.log(`[Outbox] WhatsApp channel not yet implemented (Phase 4+)`);
      return { success: true }; // Mark as success to not retry
    }

    case "in_app": {
      // in_app notifications are handled by the emit_notification_event function
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown channel: ${channel_slug}` };
  }
}

// Calculate next retry time with exponential backoff
function calculateNextRetry(retries: number): Date {
  // Exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min, 64min, etc.
  const delayMinutes = Math.pow(2, retries);
  const maxDelayMinutes = 60; // Cap at 1 hour
  const actualDelay = Math.min(delayMinutes, maxDelayMinutes);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + actualDelay);
  return nextRetry;
}

// Main handler
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get pending outbox items (limit to 50 per batch)
    // Only process items that are ready for retry (next_retry_at is null or in the past)
    const { data: outboxItems, error: fetchError } = await supabase
      .from("notification_outbox")
      .select("id, bu_id, user_id, event_slug, channel_slug, payload, status, retries, max_retries")
      .eq("status", "pending")
      .or("next_retry_at.is.null,next_retry_at.lte.now()")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch outbox items: ${fetchError.message}`);
    }

    if (!outboxItems || outboxItems.length === 0) {
      console.log("[Outbox] No pending items to process");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Outbox] Processing ${outboxItems.length} items`);

    let successCount = 0;
    let failCount = 0;

    for (const item of outboxItems as OutboxItem[]) {
      const maxRetries = item.max_retries || 10;
      const result = await processOutboxItem(supabase, item);

      if (result.success) {
        // Mark as sent
        await supabase
          .from("notification_outbox")
          .update({ 
            status: "sent",
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        successCount++;
        console.log(`[Outbox] SUCCESS outbox_id=${item.id} channel=${item.channel_slug}`);
      } else {
        const newRetries = item.retries + 1;
        const isFinalFailure = newRetries >= maxRetries;
        
        // Update with retry info or mark as failed
        await supabase
          .from("notification_outbox")
          .update({
            retries: newRetries,
            last_error: result.error?.slice(0, 500), // Limit error length
            status: isFinalFailure ? "failed" : "pending",
            next_retry_at: isFinalFailure ? null : calculateNextRetry(newRetries).toISOString(),
            processed_at: isFinalFailure ? new Date().toISOString() : null,
          })
          .eq("id", item.id);
        failCount++;
        console.log(`[Outbox] FAIL outbox_id=${item.id} channel=${item.channel_slug} retry=${newRetries}/${maxRetries} error=${result.error?.slice(0, 100)}`);
      }
    }

    console.log(`[Outbox] Processed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        processed: outboxItems.length,
        success: successCount,
        failed: failCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[Outbox] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
