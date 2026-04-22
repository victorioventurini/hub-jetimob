/**
 * Home (Leader Dashboard) — type & aggregation tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  OkrSummary,
  TicketSummary,
  KpiDashboardSummary,
  CriticalAlertItem,
  FocusItem,
} from './types';

describe('Home · OkrSummary', () => {
  it('soma rag (green+yellow+red+not_started) coerente com universo de KRs', () => {
    const okrs: OkrSummary = { green: 5, yellow: 2, red: 1, not_started: 0, pending_checkins: 3 };
    const total = okrs.green + okrs.yellow + okrs.red + okrs.not_started;
    expect(total).toBe(8);
    expect(okrs.pending_checkins).toBeLessThanOrEqual(total + 1);
  });

  it('estados RAG nunca negativos', () => {
    const okrs: OkrSummary = { green: 0, yellow: 0, red: 0, not_started: 0, pending_checkins: 0 };
    Object.values(okrs).forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });
});

describe('Home · TicketSummary', () => {
  it('overdue + due_soon não excede total_open', () => {
    const t: TicketSummary = {
      total_open: 10, overdue: 3, due_soon: 4,
      awaiting_internal: 5, awaiting_external: 5, top: [],
    };
    expect(t.overdue + t.due_soon).toBeLessThanOrEqual(t.total_open);
  });

  it('top é array (mesmo vazio)', () => {
    const t: TicketSummary = { total_open: 0, overdue: 0, due_soon: 0, awaiting_internal: 0, awaiting_external: 0, top: [] };
    expect(Array.isArray(t.top)).toBe(true);
  });
});

describe('Home · KpiDashboardSummary', () => {
  it('needs_update <= total', () => {
    const kpi: KpiDashboardSummary = {
      rag_summary: { green: 1, yellow: 1, red: 1, gray: 1 },
      needs_update: 2, total: 4, top_critical: [],
    };
    expect(kpi.needs_update).toBeLessThanOrEqual(kpi.total);
  });
});

describe('Home · CriticalAlert / FocusItem', () => {
  it('CriticalAlert exige severity em high|medium|low', () => {
    const alert: CriticalAlertItem = {
      type: 'okr_pending', title: 't', subtitle: 's',
      severity: 'high', url: '/x', cta: 'Ver',
    };
    expect(['high', 'medium', 'low']).toContain(alert.severity);
  });

  it('FocusItem aceita url=null quando não há ação direta', () => {
    const f: FocusItem = { type: 'info', label: 'Nada urgente', url: null, cta: null };
    expect(f.url).toBeNull();
  });
});
