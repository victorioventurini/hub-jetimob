/**
 * HubNotifications — constantes e tipos compartilhados
 * Extraído de HubNotifications.tsx (refatoração P1.3)
 */
import {
  Bell,
  Mail,
  Slack,
  MessageCircle,
  Globe,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

export const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

export const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};

export type HubTabValue = 'events' | 'channels' | 'diagnostics' | 'outbox';

export interface EventFormData {
  slug: string;
  module: string;
  name: string;
  description: string;
  audience: 'internal' | 'external' | 'both';
  severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  default_channels: string[];
  icon: string;
}

export const defaultEventForm: EventFormData = {
  slug: '',
  module: 'core',
  name: '',
  description: '',
  audience: 'internal',
  severity: 'info',
  is_mandatory: false,
  default_channels: ['in_app'],
  icon: 'Bell',
};

export interface OutboxStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
  lastProcessed: string | null;
  byChannel: Record<string, { pending: number; sent: number; failed: number }>;
  byProvider: Record<string, number>;
}

export interface OutboxItem {
  id: string;
  event_slug: string;
  channel_slug: string;
  status: string;
  provider: string | null;
  created_at: string;
  sent_at: string | null;
  processed_at: string | null;
  retries: number;
  last_error: string | null;
  user_id: string | null;
}

export interface NotificationEventLite {
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

export interface NotificationChannelLite {
  slug: string;
  name: string;
  description: string | null;
  requires_configuration: boolean;
  status: string;
}
