import type { TemplateResolution, SupabaseClient } from "./types.ts";
import { SITE_URL } from "../constants.ts";

/**
 * Resolve notification template from database
 */
export async function resolveTemplate(
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
    console.log(`[Templates] No template found for ${eventSlug}/${channel}, using fallback`);
    return null;
  }

  return data[0] as TemplateResolution;
}

/**
 * Absolutiza uma URL contextual para uso em emails.
 *
 * - Se a URL já é absoluta (`https://...`), retorna inalterada (idempotente).
 * - Se é relativa (`/go/ticket/abc`), prefixa com `SITE_URL`.
 * - Se é null/undefined/vazia, retorna string vazia.
 *
 * Por que: triggers SQL gravam `context_url` como path relativo (SSOT em
 * `lib/shareableLinks.ts`). Clientes de email (Gmail, Outlook) não resolvem
 * paths relativos no inbox — links inline ficam quebrados sem absolutização.
 *
 * Ver: docs/qa/QA_EMAIL_CONTEXT_URL.md, mem://standards/notifications/email-url-absolutization
 */
export function absolutizeUrl(url: unknown): string {
  if (url === null || url === undefined) return "";
  const str = String(url).trim();
  if (!str) return "";
  if (/^https?:\/\//i.test(str)) return str;
  const path = str.startsWith("/") ? str : `/${str}`;
  return `${SITE_URL}${path}`;
}

/**
 * Render template variables.
 *
 * Variáveis cujo nome é exatamente `context_url` ou termina em `_url` são
 * automaticamente absolutizadas — ver `absolutizeUrl()`. Isso garante que
 * `[Ver detalhes]({{context_url}})` no markdown vire `<a href="https://next.jetimob.com/go/...">`
 * em vez de `<a href="/go/...">` (quebrado em emails).
 */
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const isUrlVar = key === "context_url" || key.endsWith("_url");
    const renderedValue = isUrlVar ? absolutizeUrl(value) : String(value ?? "");
    result = result.split(placeholder).join(renderedValue);
  }
  // Remove any unresolved placeholders
  result = result.replace(/\{\{\w+\}\}/g, "");
  return result;
}

/**
 * Convert markdown to simple HTML (basic conversion for email)
 */
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(.+)$/, "<p>$1</p>");
}

/**
 * Build notification email HTML from template
 */
export function buildNotificationEmailHtmlFromTemplate(
  subject: string,
  body: string,
  contextUrl: string | undefined
): string {
  // absolutizeUrl é idempotente: prefixa SITE_URL para paths relativos e retorna
  // URLs já absolutas inalteradas. Evita duplicação caso o caller passe uma URL
  // já absolutizada por engano.
  const ctaHref = absolutizeUrl(contextUrl);
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
          <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Next</h1>
        </div>
        
        <h2 style="color: #18181b; font-size: 18px; margin-bottom: 16px;">${subject}</h2>
        
        <div style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          ${bodyHtml}
        </div>
        
        ${ctaHref ? `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${ctaHref}" style="display: inline-block; background-color: #379eff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver no Next
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

/**
 * Build fallback notification email HTML (when no template exists)
 */
export function buildFallbackEmailHtml(payload: Record<string, unknown>): string {
  const title = (payload.title as string) || "Nova Notificação";
  const message = (payload.message as string) || "";
  const contextUrl = payload.context_url as string | undefined;
  return buildNotificationEmailHtmlFromTemplate(title, message, contextUrl);
}

/**
 * Helper to format date/time for templates
 */
export function formatDateForTemplate(date: Date): { date: string; time: string; datetime: string } {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
    // Format: DD/MM às HH:MM (matching magic link pattern)
    datetime: `${day}/${month} às ${hours}:${minutes}`,
  };
}

/**
 * Get BU name for template variables
 */
export async function getBuName(supabase: SupabaseClient, buId: string | null): Promise<string> {
  if (!buId) return "Next";
  
  const { data } = await supabase
    .from("bu_units")
    .select("name")
    .eq("id", buId)
    .maybeSingle();
  
  return data?.name || "Next";
}
