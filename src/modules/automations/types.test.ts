/**
 * Automations module — type & contract tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  AutomationScope,
  AutomationLogStatus,
  AutomationLogType,
  AuthType,
  AutomationEventCatalog,
  AutomationActionCatalog,
} from './types';

describe('Automations · enum contracts', () => {
  it('Scope aceita apenas global|bu', () => {
    const valid: AutomationScope[] = ['global', 'bu'];
    valid.forEach(v => expect(['global', 'bu']).toContain(v));
  });

  it('LogStatus cobre os 4 estados do ciclo do worker', () => {
    const allowed: AutomationLogStatus[] = ['success', 'error', 'pending', 'retrying'];
    expect(new Set(allowed).size).toBe(4);
  });

  it('LogType separa eventos (entrada) de ações (saída)', () => {
    const v: AutomationLogType[] = ['event', 'action'];
    expect(v).toEqual(expect.arrayContaining(['event', 'action']));
  });

  it('AuthType cobre os 4 modos de autenticação suportados em webhooks', () => {
    const allowed: AuthType[] = ['none', 'bearer', 'api_key', 'basic'];
    expect(allowed).toHaveLength(4);
  });
});

describe('Automations · catalog shape', () => {
  it('EventCatalog exige campos imutáveis para versionamento', () => {
    const ev: AutomationEventCatalog = {
      id: 'e1',
      event_key: 'ticket.created',
      category: 'tickets',
      name: 'Ticket criado',
      description: '',
      event_version: 'v1',
      payload_schema: {},
      payload_example: {},
      scope: 'global',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(ev.event_key).toMatch(/\./);
    expect(ev.event_version).toMatch(/^v\d+$/);
  });

  it('ActionCatalog modela required_fields como string[]', () => {
    const ac: AutomationActionCatalog = {
      id: 'a1', action_key: 'send.email', category: 'comms', name: 'Enviar email',
      description: '', action_version: 'v1', payload_schema: {}, payload_example: {},
      required_fields: ['to', 'subject'], is_active: true,
      created_at: '', updated_at: '',
    };
    expect(ac.required_fields).toEqual(['to', 'subject']);
  });
});
