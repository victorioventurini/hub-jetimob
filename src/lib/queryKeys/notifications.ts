/**
 * Notifications Query Keys
 */
export const notificationsKeys = {
  all: (userId?: string | null) => userId ? ['notifications', userId] as const : ['notifications'] as const,
  unread: (userId: string) => ['notifications', 'unread', userId] as const,
  count: (userId: string) => ['notifications', 'count', userId] as const,
  settings: (userId: string, buId: string) => ['notifications', 'settings', userId, buId] as const,
  events: () => ['notifications', 'events'] as const,
  channels: () => ['notifications', 'channels'] as const,
  buChannels: (buId: string | null) => ['notifications', 'bu-channels', buId] as const,
  buEventSettings: (buId: string | null) => ['notifications', 'bu-event-settings', buId] as const,
  outbox: (buId: string | null, filters?: { status?: string; channel?: string }) => 
    ['notifications', 'outbox', buId, filters] as const,
  inAppLogs: (buId: string | null, filters?: { read?: boolean }) => 
    ['notifications', 'in-app-logs', buId, filters] as const,
  // Phase 4: SLO & Health
  sloByChannel: (period: '7d' | '30d') => ['notifications', 'slo-by-channel', period] as const,
  sloByEvent: (period: '7d' | '30d') => ['notifications', 'slo-by-event', period] as const,
  sloSummary: () => ['notifications', 'slo-summary-7d'] as const,
  healthAlerts: () => ['notifications', 'health-alerts'] as const,
  healthRunbooks: () => ['notifications', 'health-runbooks'] as const,
  alertActions: (alertId: string) => ['notifications', 'alert-actions', alertId] as const,
  // Phase 5: Templates
  templates: {
    list: (buId: string | null, filters?: { channel?: string; eventSlug?: string }) => 
      ['notifications', 'templates', 'list', buId, filters] as const,
    detail: (templateId: string) => ['notifications', 'templates', 'detail', templateId] as const,
    versions: (templateId: string) => ['notifications', 'templates', 'versions', templateId] as const,
    variables: (eventSlug: string | null) => ['notifications', 'templates', 'variables', eventSlug] as const,
    audit: (templateId: string) => ['notifications', 'templates', 'audit', templateId] as const,
  },
} as const;

export const hubNotificationsKeys = {
  outboxStatsGlobal: () => ['notification-outbox-stats-global'] as const,
  outboxItems: () => ['notification-outbox-items'] as const,
  healthAlertsGlobal: () => ['notification-health-alerts-global'] as const,
  eventsPrefix: () => ['notification-events'] as const,
  channelsPrefix: () => ['notification-channels'] as const,
} as const;

export const notificationAdminKeys = {
  outboxStats: () => ['notifications', 'outbox-stats'] as const,
} as const;
