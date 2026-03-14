import type { SlackConfig, OutboxItem, ProviderResult } from "./types.ts";

/**
 * Send notification via Slack (webhook or bot token)
 */
export async function sendSlack(
  config: SlackConfig,
  payload: Record<string, unknown>,
  item: OutboxItem
): Promise<ProviderResult> {
  const title = (payload.title as string) || "Nova Notificação";
  const message = (payload.message as string) || "";
  const contextUrl = payload.context_url as string | undefined;
  const siteUrl = SITE_URL;
  
  console.log(`[Slack] Sending notification for outbox_id=${item.id}`);

  const blocks = [
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
  ];

  // Slack Incoming Webhook mode
  if (config.webhook_url) {
    const slackPayload = {
      text: `*${title}*\n${message}`,
      blocks,
    };

    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
      blocks,
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
      return { success: false, error: `Slack API error: ${result.error || "unknown"}` };
    }

    return { success: true };
  }

  return { success: false, error: "Slack not configured (missing webhook_url or bot_token+channel)" };
}
