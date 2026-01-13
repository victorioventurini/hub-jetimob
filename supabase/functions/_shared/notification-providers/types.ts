// Shared types for notification providers

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
}

export interface SlackConfig {
  webhook_url?: string;
  bot_token?: string;
  default_channel_id?: string;
  default_channel_name?: string;
  configured?: boolean;
}

export interface WebhookConfig {
  url?: string;
  http_method?: string;
  secret_header_name?: string;
  secret_header_value?: string;
  configured?: boolean;
}

export interface TemplateResolution {
  template_id: string;
  version_id: string;
  subject: string | null;
  body: string;
  variables_used: string[];
  is_bu_override: boolean;
}

export interface OutboxItem {
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

export interface ProviderResult {
  success: boolean;
  provider?: string;
  error?: string;
}

// deno-lint-ignore no-explicit-any
export type SupabaseClient = any;
