/**
 * Wave 2 — Tests for notifications query keys (multi-namespace).
 */
import { describe, it, expect } from 'vitest';
import {
  notificationsKeys,
  hubNotificationsKeys,
  notificationAdminKeys,
} from './notifications';

describe('notificationsKeys.all overload', () => {
  it('com userId', () => {
    expect(notificationsKeys.all('u1')).toEqual(['notifications', 'u1']);
  });
  it('sem userId retorna prefix', () => {
    expect(notificationsKeys.all()).toEqual(['notifications']);
    expect(notificationsKeys.all(null)).toEqual(['notifications']);
  });
  it('com userId + buId isola por BU', () => {
    expect(notificationsKeys.all('u1', 'bu1')).toEqual(['notifications', 'u1', 'bu1']);
    expect(notificationsKeys.all('u1', 'bu2')).toEqual(['notifications', 'u1', 'bu2']);
    expect(notificationsKeys.all('u1', null)).toEqual(['notifications', 'u1', null]);
  });
});

describe('notificationsKeys.allPrefix', () => {
  it('retorna prefixo para invalidar todas as variantes de BU', () => {
    expect(notificationsKeys.allPrefix('u1')).toEqual(['notifications', 'u1']);
    expect(notificationsKeys.allPrefix()).toEqual(['notifications']);
    expect(notificationsKeys.allPrefix(null)).toEqual(['notifications']);
  });
});

describe('notificationsKeys — user-scoped', () => {
  it('unread/count/settings', () => {
    expect(notificationsKeys.unread('u1')).toEqual(['notifications', 'unread', 'u1']);
    expect(notificationsKeys.count('u1')).toEqual(['notifications', 'count', 'u1']);
    expect(notificationsKeys.settings('u1', 'bu1')).toEqual([
      'notifications', 'settings', 'u1', 'bu1',
    ]);
  });
});

describe('notificationsKeys — globals', () => {
  it('events/channels/buChannels/buEventSettings', () => {
    expect(notificationsKeys.events()).toEqual(['notifications', 'events']);
    expect(notificationsKeys.channels()).toEqual(['notifications', 'channels']);
    expect(notificationsKeys.buChannels('bu1')).toEqual([
      'notifications', 'bu-channels', 'bu1',
    ]);
    expect(notificationsKeys.buEventSettings('bu1')).toEqual([
      'notifications', 'bu-event-settings', 'bu1',
    ]);
  });
});

describe('notificationsKeys — outbox/in-app', () => {
  it('outbox com filters', () => {
    expect(notificationsKeys.outbox('bu1', { status: 'sent' })).toEqual([
      'notifications', 'outbox', 'bu1', { status: 'sent' },
    ]);
  });
  it('inAppLogs com filters', () => {
    expect(notificationsKeys.inAppLogs('bu1', { read: false })).toEqual([
      'notifications', 'in-app-logs', 'bu1', { read: false },
    ]);
  });
});

describe('notificationsKeys — SLO & Health (Phase 4)', () => {
  it('slo by channel/event', () => {
    expect(notificationsKeys.sloByChannel('7d')).toEqual([
      'notifications', 'slo-by-channel', '7d',
    ]);
    expect(notificationsKeys.sloByEvent('30d')).toEqual([
      'notifications', 'slo-by-event', '30d',
    ]);
    expect(notificationsKeys.sloSummary()).toEqual([
      'notifications', 'slo-summary-7d',
    ]);
  });
  it('alerts/runbooks/actions', () => {
    expect(notificationsKeys.healthAlerts()).toEqual(['notifications', 'health-alerts']);
    expect(notificationsKeys.healthRunbooks()).toEqual(['notifications', 'health-runbooks']);
    expect(notificationsKeys.alertActions('a1')).toEqual([
      'notifications', 'alert-actions', 'a1',
    ]);
  });
});

describe('notificationsKeys.templates (Phase 5)', () => {
  it('todos namespaces', () => {
    expect(notificationsKeys.templates.list('bu1', { channel: 'email' })).toEqual([
      'notifications', 'templates', 'list', 'bu1', { channel: 'email' },
    ]);
    expect(notificationsKeys.templates.detail('t1')).toEqual([
      'notifications', 'templates', 'detail', 't1',
    ]);
    expect(notificationsKeys.templates.versions('t1')).toEqual([
      'notifications', 'templates', 'versions', 't1',
    ]);
    expect(notificationsKeys.templates.variables('event-x')).toEqual([
      'notifications', 'templates', 'variables', 'event-x',
    ]);
    expect(notificationsKeys.templates.audit('t1')).toEqual([
      'notifications', 'templates', 'audit', 't1',
    ]);
  });
});

describe('hubNotificationsKeys & notificationAdminKeys', () => {
  it('hub namespaces', () => {
    expect(hubNotificationsKeys.outboxStatsGlobal()).toEqual([
      'notification-outbox-stats-global',
    ]);
    expect(hubNotificationsKeys.outboxItems()).toEqual(['notification-outbox-items']);
    expect(hubNotificationsKeys.healthAlertsGlobal()).toEqual([
      'notification-health-alerts-global',
    ]);
    expect(hubNotificationsKeys.eventsPrefix()).toEqual(['notification-events']);
    expect(hubNotificationsKeys.channelsPrefix()).toEqual(['notification-channels']);
  });
  it('admin', () => {
    expect(notificationAdminKeys.outboxStats()).toEqual(['notifications', 'outbox-stats']);
  });
});
