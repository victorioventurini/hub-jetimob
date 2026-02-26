/**
 * Webhook simulation utility
 */
import type { WebhookLog } from "../types";

export function simulateWebhookSend(payload: Record<string, unknown>): WebhookLog {
  const success = Math.random() > 0.15; // 85% success rate
  return {
    id: `wh-${Date.now()}`,
    timestamp: new Date().toISOString(),
    payload,
    statusCode: success ? 200 : 500,
    success,
    responseTime: Math.round(80 + Math.random() * 400),
  };
}

export function buildOpportunityWebhookPayload(
  opportunity: Record<string, unknown>,
  participant: Record<string, unknown>,
  event: Record<string, unknown>,
): Record<string, unknown> {
  return {
    event_type: "opportunity.created",
    timestamp: new Date().toISOString(),
    data: {
      opportunity,
      participant,
      event,
    },
  };
}
