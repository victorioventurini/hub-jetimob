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
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
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

// Build notification email HTML
function buildNotificationEmailHtml(payload: Record<string, unknown>): string {
  const title = (payload.title as string) || "Nova Notificação";
  const message = (payload.message as string) || "";
  const contextUrl = payload.context_url as string | undefined;

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
        
        <h2 style="color: #18181b; font-size: 18px; margin-bottom: 16px;">${title}</h2>
        
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          ${message}
        </p>
        
        ${
          contextUrl
            ? `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${Deno.env.get("SITE_URL") || "https://hub.jetimob.com"}${contextUrl}" style="display: inline-block; background-color: #379eff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver no Hub
          </a>
        </div>
        `
            : ""
        }
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          O ponto de encontro para evoluir, executar e simplificar o morar.
        </p>
      </div>
    </body>
    </html>
  `;
}

// Process a single outbox item
async function processOutboxItem(
  supabase: SupabaseClient,
  item: OutboxItem
): Promise<{ success: boolean; error?: string }> {
  const { channel_slug, payload, user_id } = item;

  // Get user email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("user_id", user_id)
    .maybeSingle();

  const profileData = profile as { email: string; display_name: string } | null;

  if (profileError || !profileData?.email) {
    return { success: false, error: "User email not found" };
  }

  switch (channel_slug) {
    case "email": {
      const html = buildNotificationEmailHtml(payload);
      const title = (payload.title as string) || "Nova Notificação";
      return await sendEmail(supabase, {
        to: profileData.email,
        subject: `[Hub] ${title}`,
        html,
      });
    }

    case "slack": {
      // TODO: Implement Slack webhook integration
      console.log(`[Outbox] Slack channel not yet implemented`);
      return { success: true }; // Mark as success to not retry
    }

    case "whatsapp": {
      // TODO: Implement WhatsApp API integration
      console.log(`[Outbox] WhatsApp channel not yet implemented`);
      return { success: true }; // Mark as success to not retry
    }

    case "webhook": {
      // TODO: Implement generic webhook
      console.log(`[Outbox] Webhook channel not yet implemented`);
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

// Main handler
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get pending outbox items (limit to 50 per batch)
    const { data: outboxItems, error: fetchError } = await supabase
      .from("notification_outbox")
      .select("*")
      .eq("status", "pending")
      .lt("retries", 3)
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
      const result = await processOutboxItem(supabase, item);

      if (result.success) {
        // Mark as sent
        await supabase
          .from("notification_outbox")
          .update({ status: "sent" })
          .eq("id", item.id);
        successCount++;
      } else {
        // Increment retry count and update error
        await supabase
          .from("notification_outbox")
          .update({
            retries: item.retries + 1,
            last_error: result.error,
            status: item.retries + 1 >= 3 ? "failed" : "pending",
          })
          .eq("id", item.id);
        failCount++;
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
