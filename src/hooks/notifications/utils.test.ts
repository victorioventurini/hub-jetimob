import { describe, it, expect } from 'vitest';
import { groupSettingsByModule, moduleNames } from './utils';
import type { UserNotificationSetting } from './types';

describe('groupSettingsByModule', () => {
  it('should group settings by module correctly', () => {
    const settings: UserNotificationSetting[] = [
      {
        event_slug: 'ticket_created',
        event_name: 'Ticket Criado',
        event_description: 'Notificação de novo ticket',
        event_module: 'tickets',
        event_severity: 'info',
        is_mandatory: false,
        channel_slug: 'email',
        channel_name: 'E-mail',
        enabled: true,
      },
      {
        event_slug: 'ticket_created',
        event_name: 'Ticket Criado',
        event_description: 'Notificação de novo ticket',
        event_module: 'tickets',
        event_severity: 'info',
        is_mandatory: false,
        channel_slug: 'in_app',
        channel_name: 'In-App',
        enabled: true,
      },
      {
        event_slug: 'okr_checkin_due',
        event_name: 'Check-in Pendente',
        event_description: 'Lembrete de check-in',
        event_module: 'okrs',
        event_severity: 'warning',
        is_mandatory: true,
        channel_slug: 'email',
        channel_name: 'E-mail',
        enabled: false,
      },
    ];

    const result = groupSettingsByModule(settings);

    // Should have two modules
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('tickets');
    expect(result).toHaveProperty('okrs');

    // Tickets module should have one event with two channels
    expect(Object.keys(result.tickets.events)).toHaveLength(1);
    expect(result.tickets.events.ticket_created.channels).toEqual({
      email: true,
      in_app: true,
    });

    // OKRs module should have one event with one channel
    expect(Object.keys(result.okrs.events)).toHaveLength(1);
    expect(result.okrs.events.okr_checkin_due.channels).toEqual({
      email: false,
    });
  });

  it('should handle empty settings array', () => {
    const result = groupSettingsByModule([]);
    expect(result).toEqual({});
  });

  it('should preserve event metadata', () => {
    const settings: UserNotificationSetting[] = [
      {
        event_slug: 'critical_alert',
        event_name: 'Alerta Crítico',
        event_description: 'Algo urgente',
        event_module: 'core',
        event_severity: 'critical',
        is_mandatory: true,
        channel_slug: 'email',
        channel_name: 'E-mail',
        enabled: true,
      },
    ];

    const result = groupSettingsByModule(settings);

    expect(result.core.events.critical_alert).toEqual({
      name: 'Alerta Crítico',
      description: 'Algo urgente',
      severity: 'critical',
      is_mandatory: true,
      channels: { email: true },
    });
  });
});

describe('moduleNames', () => {
  it('should have all expected modules', () => {
    expect(moduleNames).toHaveProperty('core');
    expect(moduleNames).toHaveProperty('okrs');
    expect(moduleNames).toHaveProperty('tickets');
    expect(moduleNames).toHaveProperty('assets');
    expect(moduleNames).toHaveProperty('teams');
    expect(moduleNames).toHaveProperty('kpis');
  });

  it('should have Portuguese labels', () => {
    expect(moduleNames.core).toBe('Geral');
    expect(moduleNames.okrs).toBe('OKRs');
  });
});
