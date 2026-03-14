import type { EmailOptions, ProviderResult, SupabaseClient } from "./types.ts";
import { NO_REPLY_EMAIL, DEFAULT_SENDER_NAME, GLOBAL_BCC_EMAIL } from "../constants.ts";

/**
 * Email provider for notification system.
 * 
 * ## Global Observability
 * All emails include a silent BCC to GLOBAL_BCC_EMAIL for monitoring.
 * This is transparent to end users and does not affect delivery metrics.
 */

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
    console.warn(`[Email] ${integrationKey} integration not available`);
    return null;
  }

  const row = data as { config_encrypted: { api_key?: string } | null; is_enabled_global: boolean };
  if (!row.is_enabled_global) {
    console.warn(`[Email] ${integrationKey} integration not enabled`);
    return null;
  }

  return row.config_encrypted?.api_key || null;
}

// Send email via SendGrid
async function sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<void> {
  console.log(`[Email] Sending to ${options.to} via SendGrid`);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ 
        to: [{ email: options.to }], 
        subject: options.subject,
        bcc: [{ email: GLOBAL_BCC_EMAIL }], // Silent BCC for observability
      }],
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
  console.log(`[Email] Sending to ${options.to} via Resend`);

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
      bcc: [GLOBAL_BCC_EMAIL], // Silent BCC for observability
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${response.status} - ${errorText}`);
  }
}

/**
 * Send email using available provider (SendGrid primary, Resend fallback)
 */
export async function sendEmail(
  supabase: SupabaseClient,
  options: EmailOptions
): Promise<ProviderResult> {
  console.log(`[Email] Attempting to send to=${options.to} subject="${options.subject}"`);
  
  // Try SendGrid first (primary)
  const sendgridKey = await getIntegrationApiKey(supabase, "sendgrid");
  if (sendgridKey) {
    try {
      await sendViaSendGrid(options, sendgridKey);
      console.log(`[Email] ✅ SENT via SendGrid to=${options.to}`);
      return { success: true, provider: "sendgrid" };
    } catch (error: unknown) {
      console.error("[Email] SendGrid failed, trying Resend fallback:", error instanceof Error ? error.message : error);
    }
  } else {
    console.warn("[Email] SendGrid not configured, trying Resend...");
  }

  // Fallback to Resend
  const resendKey = await getIntegrationApiKey(supabase, "resend");
  if (resendKey) {
    try {
      await sendViaResend(options, resendKey);
      console.log(`[Email] ✅ SENT via Resend (fallback) to=${options.to}`);
      return { success: true, provider: "resend" };
    } catch (error: unknown) {
      console.error("[Email] Resend also failed:", error instanceof Error ? error.message : error);
      return { success: false, error: `Resend error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  console.error("[Email] ❌ NO EMAIL PROVIDER CONFIGURED - both SendGrid and Resend are missing or disabled");
  return { success: false, error: "No email provider configured (SendGrid and Resend both unavailable)" };
}
