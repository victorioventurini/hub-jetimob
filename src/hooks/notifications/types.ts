import type { Json } from '@/integrations/supabase/types';

// Types for notification center hooks
export interface NotificationEvent {
  id: string;
  slug: string;
  module: string;
  name: string;
  description: string | null;
  audience: 'internal' | 'external' | 'both';
  severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  default_channels: string[];
  icon: string | null;
}

export interface NotificationChannel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  requires_configuration: boolean;
  status: string;
  display_order: number;
}

export interface BuNotificationChannel {
  id: string;
  bu_id: string;
  channel_slug: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationSetting {
  event_slug: string;
  event_name: string;
  event_description: string | null;
  event_module: string;
  event_severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  channel_slug: string;
  channel_name: string;
  enabled: boolean;
}

export interface EmitNotificationParams {
  eventSlug: string;
  recipientUserIds: string[];
  title?: string;
  message?: string;
  contextType?: string;
  contextId?: string;
  contextUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface UpsertChannelParams {
  buId: string;
  channelSlug: string;
  isEnabled: boolean;
  config?: Json;
}

export interface UpdatePreferenceParams {
  eventSlug: string;
  channelSlug: string;
  enabled: boolean;
}

export interface SendTestNotificationParams {
  targetProfileId: string;
  channels?: string[];
}

export interface TestNotificationResult {
  notification_id: string | null;
  outbox_id: string | null;
  channel: string;
  status: string;
  error_message: string | null;
}
