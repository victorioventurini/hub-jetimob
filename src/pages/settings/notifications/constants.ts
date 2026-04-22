/**
 * SettingsNotifications — constantes e helpers compartilhados
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import {
  Bell,
  Mail,
  Slack,
  MessageCircle,
  Globe,
} from 'lucide-react';

export const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

export const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};

export type TabValue = 'channels' | 'events' | 'templates' | 'outbox' | 'inapp' | 'test';

export const CONFIGURABLE_CHANNELS = ['email', 'slack', 'webhook'];
export const ACTIVE_CHANNELS = ['in_app', 'email', 'slack', 'webhook']; // WhatsApp out of scope

export function isChannelConfiguredFromConfig(
  channelSlug: string,
  config: Record<string, unknown> | null | undefined,
): boolean {
  if (!config) return false;
  if (channelSlug === 'slack') {
    return Boolean(
      config.webhook_url ||
        (config.bot_token && (config.default_channel_id || config.default_channel_name)),
    );
  }
  if (channelSlug === 'webhook') {
    return Boolean(config.url);
  }
  if (channelSlug === 'email') {
    return true;
  }
  return true;
}
