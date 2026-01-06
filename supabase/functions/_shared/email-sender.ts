/**
 * Unified Email Sender Utility
 * 
 * Primary: SendGrid
 * Fallback: Resend (Lovable)
 * 
 * All emails in the Hub should use this utility to ensure
 * consistent delivery with automatic fallback.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Note: Resend API key is now fetched from hub_integrations_global_config

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: {
    email: string;
    name: string;
  };
}

export interface EmailResult {
  success: boolean;
  provider: "sendgrid" | "resend";
  error?: string;
}

// Get integration API key from hub_integrations_global_config
async function getIntegrationApiKey(integrationKey: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (error) {
    console.error(`[EmailSender] Error fetching ${integrationKey} config:`, error);
    return null;
  }

  if (!data || !data.is_enabled_global) {
    console.warn(`[EmailSender] ${integrationKey} integration is not enabled`);
    return null;
  }

  const config = data.config_encrypted as { api_key?: string } | null;
  return config?.api_key || null;
}

// Send email via SendGrid
async function sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<void> {
  const { to, subject, html, from } = options;
  
  console.log(`[EmailSender] Attempting to send email to ${to} via SendGrid`);
  
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: from || {
        email: "no-reply@hub.jetimob.com",
        name: "Hub",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
  }
  
  console.log(`[EmailSender] Email sent successfully via SendGrid to: ${to}`);
}

// Send email via Resend (fallback)
async function sendViaResend(options: EmailOptions, apiKey: string): Promise<void> {
  const { to, subject, html, from } = options;
  
  console.log(`[EmailSender] Attempting to send email to ${to} via Resend (fallback)`);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from ? `${from.name} <${from.email}>` : "Hub <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }
  
  console.log(`[EmailSender] Email sent successfully via Resend (fallback) to: ${to}`);
}

/**
 * Send an email using SendGrid as primary provider and Resend as fallback.
 * 
 * @param options - Email options (to, subject, html, from)
 * @returns Result indicating success, provider used, and any error
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Try SendGrid first
  try {
    const sendgridApiKey = await getIntegrationApiKey("sendgrid");
    
    if (sendgridApiKey) {
      await sendViaSendGrid(options, sendgridApiKey);
      return { success: true, provider: "sendgrid" };
    } else {
      console.warn("[EmailSender] SendGrid not configured, trying fallback...");
    }
  } catch (error: any) {
    console.error("[EmailSender] SendGrid failed:", error.message);
    console.log("[EmailSender] Attempting fallback to Resend...");
  }

  // Fallback to Resend (from hub_integrations_global_config)
  try {
    const resendApiKey = await getIntegrationApiKey("resend");
    
    if (resendApiKey) {
      await sendViaResend(options, resendApiKey);
      return { success: true, provider: "resend" };
    } else {
      console.warn("[EmailSender] Resend fallback not configured");
    }
  } catch (error: any) {
    console.error("[EmailSender] Resend fallback also failed:", error.message);
    return { 
      success: false, 
      provider: "resend",
      error: `Both SendGrid and Resend failed. Last error: ${error.message}`
    };
  }

  // No providers available
  console.error("[EmailSender] No email providers available (SendGrid and Resend not configured)");
  return {
    success: false,
    provider: "sendgrid",
    error: "Nenhum provedor de email configurado. Configure SendGrid ou Resend nas integrações."
  };
}

/**
 * Build magic link email HTML template
 */
export function buildMagicLinkEmailHtml(options: {
  magicLink: string;
  displayName?: string;
  buName?: string;
}): string {
  const { magicLink, displayName = "usuário", buName } = options;
  const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  
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
        
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Olá, ${formattedName}!
        </p>
        
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          Clique no botão abaixo para acessar o Hub.<br>
          Este link é válido por 1 hora.
        </p>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${magicLink}" style="display: inline-block; background-color: #379eff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Acessar o Hub
          </a>
        </div>
        
        <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
          Se você não solicitou este link, pode ignorar este e-mail com segurança.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          O ponto de encontro para evoluir, executar e simplificar o morar.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Format current date/time for email subject
 * Returns format: DD/MM às HH:MM
 */
export function formatEmailDateTime(): string {
  const now = new Date();
  // Brazil timezone (UTC-3)
  const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  
  const day = String(brazilTime.getUTCDate()).padStart(2, '0');
  const month = String(brazilTime.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(brazilTime.getUTCHours()).padStart(2, '0');
  const minutes = String(brazilTime.getUTCMinutes()).padStart(2, '0');
  
  return `${day}/${month} às ${hours}:${minutes}`;
}
