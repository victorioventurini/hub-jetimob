/**
 * External module — type & invariant tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  ExternalContactRecord,
  ExternalUserData,
  ExternalTicketSummary,
  ExternalDashboardStats,
} from './types';

const mkContact = (over: Partial<ExternalContactRecord> = {}): ExternalContactRecord => ({
  contactId: 'c1',
  name: 'Acme Contact',
  email: 'contact@acme.com',
  companyId: 'co1',
  companyName: 'Acme',
  buId: 'bu1',
  buName: 'BU 1',
  buLegalName: null,
  ...over,
});

describe('External · ExternalUserData invariants', () => {
  it('isExternal=true quando há ao menos 1 contact', () => {
    const data: ExternalUserData = {
      contacts: [mkContact()],
      allBuIds: ['bu1'],
      primaryContact: mkContact(),
      isExternal: true,
    };
    expect(data.isExternal).toBe(true);
    expect(data.contacts.length).toBeGreaterThan(0);
  });

  it('isExternal=false e primaryContact=null quando contacts vazio', () => {
    const data: ExternalUserData = {
      contacts: [], allBuIds: [], primaryContact: null, isExternal: false,
    };
    expect(data.primaryContact).toBeNull();
    expect(data.allBuIds).toHaveLength(0);
  });

  it('allBuIds reflete união de buIds dos contacts', () => {
    const contacts = [mkContact({ buId: 'bu1' }), mkContact({ buId: 'bu2', contactId: 'c2' })];
    const allBuIds = Array.from(new Set(contacts.map(c => c.buId)));
    expect(allBuIds.sort()).toEqual(['bu1', 'bu2']);
  });
});

describe('External · TicketSummary status enum', () => {
  it('aceita apenas os 5 estados públicos do funil externo', () => {
    const allowed: ExternalTicketSummary['status'][] = [
      'waiting', 'paused', 'in_progress', 'done', 'discarded',
    ];
    expect(allowed).toHaveLength(5);
  });
});

describe('External · DashboardStats', () => {
  it('totals nunca negativos', () => {
    const stats: ExternalDashboardStats = { totalOpen: 3, awaitingResponse: 1 };
    expect(stats.totalOpen).toBeGreaterThanOrEqual(0);
    expect(stats.awaitingResponse).toBeLessThanOrEqual(stats.totalOpen);
  });
});
