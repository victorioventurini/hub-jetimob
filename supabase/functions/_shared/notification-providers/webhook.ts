import type { WebhookConfig, OutboxItem, ProviderResult } from "./types.ts";

/**
 * Send notification via custom webhook
 */
export async function sendWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>,
  item: OutboxItem
): Promise<ProviderResult> {
  if (!config.url) {
    return { success: false, error: "Webhook URL not configured" };
  }

  const siteUrl = SITE_URL;
  const contextUrl = payload.context_url as string | undefined;
  
  console.log(`[Webhook] Sending for outbox_id=${item.id}`);

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
