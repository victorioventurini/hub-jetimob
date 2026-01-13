import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  type OutboxItem,
  type SlackConfig,
  type WebhookConfig,
  type SupabaseClient,
  sendEmail,
  sendSlack,
  sendWebhook,
  resolveTemplate,
  renderTemplate,
  buildNotificationEmailHtmlFromTemplate,
  buildFallbackEmailHtml,
  formatDateForTemplate,
  getBuName,
} from "../_shared/notification-providers/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Process a single outbox item
async function processOutboxItem(
  supabase: SupabaseClient,
  item: OutboxItem
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { channel_slug, payload, user_id, bu_id } = item;

  // Use canonical resolver for recipient info
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
      
      const buName = await getBuName(supabase, bu_id);
      const now = new Date();
      const dateVars = formatDateForTemplate(now);
      
      const templateVars: Record<string, unknown> = {
        bu_name: buName,
        user_name: recipient.display_name || "Usuário",
        current_date: dateVars.date,
        current_time: dateVars.time,
        current_datetime: dateVars.datetime,
        ...payload,
        context_url: payload.context_url,
      };
      
      const template = await resolveTemplate(supabase, item.event_slug, "email", bu_id);
      
      let subject: string;
      let html: string;
      
      if (template) {
        subject = renderTemplate(template.subject || "{{title}}", templateVars);
        const renderedBody = renderTemplate(template.body, templateVars);
        html = buildNotificationEmailHtmlFromTemplate(subject, renderedBody, payload.context_url as string | undefined);
        console.log(`[Outbox] Using template version_id=${template.version_id} for ${item.event_slug}/email`);
      } else {
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
      console.log(`[Outbox] WhatsApp channel not yet implemented (Phase 4+)`);
      return { success: true };
    }

    case "in_app": {
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown channel: ${channel_slug}` };
  }
}

// Calculate next retry time with exponential backoff
function calculateNextRetry(retries: number): Date {
  const delayMinutes = Math.pow(2, retries);
  const maxDelayMinutes = 60;
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
        const updateData: Record<string, unknown> = { 
          status: "sent",
          processed_at: new Date().toISOString(),
        };
        
        const providerInfo = result.provider;
        if (providerInfo) {
          updateData.provider = providerInfo;
        } else if (item.channel_slug !== "email") {
          updateData.provider = item.channel_slug;
        }
        
        await supabase
          .from("notification_outbox")
          .update(updateData)
          .eq("id", item.id);
        successCount++;
        const providerLog = providerInfo ? ` provider=${providerInfo}` : "";
        console.log(`[Outbox] ✅ SUCCESS outbox_id=${item.id} channel=${item.channel_slug}${providerLog}`);
      } else {
        const newRetries = item.retries + 1;
        const isFinalFailure = newRetries >= maxRetries;
        
        await supabase
          .from("notification_outbox")
          .update({
            retries: newRetries,
            last_error: result.error?.slice(0, 500),
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
