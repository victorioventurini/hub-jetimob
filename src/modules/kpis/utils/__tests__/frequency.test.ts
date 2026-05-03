import { describe, it, expect } from 'vitest';
import {
  FREQUENCY_DAYS,
  isUpdateFrequencyValid,
  getValidUpdateFrequencies,
  legacyFrequencyToValue,
  getConsolidationPeriod,
  suggestInputType,
  isKpiUpdateOverdue,
  getMissingConsolidationPeriods,
  isKpiConsolidationPending,
} from '../frequency';

describe('frequency.ts — KPI Frequency utilities', () => {
  describe('isUpdateFrequencyValid', () => {
    it('aceita update_frequency mais frequente que consolidation', () => {
      expect(isUpdateFrequencyValid('monthly', 'weekly')).toBe(true);
      expect(isUpdateFrequencyValid('quarterly', 'monthly')).toBe(true);
    });
    it('aceita iguais (sem janela intermediária)', () => {
      expect(isUpdateFrequencyValid('monthly', 'monthly')).toBe(true);
    });
    it('rejeita update menos frequente que consolidation', () => {
      expect(isUpdateFrequencyValid('weekly', 'monthly')).toBe(false);
      expect(isUpdateFrequencyValid('daily', 'weekly')).toBe(false);
    });
    it('aceita quando algum valor é nulo (validação adiada)', () => {
      expect(isUpdateFrequencyValid(null, 'weekly')).toBe(true);
      expect(isUpdateFrequencyValid('monthly', undefined)).toBe(true);
    });
  });

  describe('getValidUpdateFrequencies', () => {
    it('lista apenas frequências ≤ consolidation', () => {
      expect(getValidUpdateFrequencies('monthly')).toEqual([
        'daily',
        'weekly',
        'biweekly',
        'monthly',
      ]);
    });
    it('retorna todas quando consolidation é null', () => {
      expect(getValidUpdateFrequencies(null)).toHaveLength(7);
    });
  });

  describe('legacyFrequencyToValue', () => {
    it('mapeia valores básicos', () => {
      expect(legacyFrequencyToValue('daily')).toBe('daily');
      expect(legacyFrequencyToValue('weekly')).toBe('weekly');
      expect(legacyFrequencyToValue('monthly')).toBe('monthly');
      expect(legacyFrequencyToValue('quarterly')).toBe('quarterly');
    });
    it('retorna null para manual e nulos', () => {
      expect(legacyFrequencyToValue('manual')).toBeNull();
      expect(legacyFrequencyToValue(null)).toBeNull();
      expect(legacyFrequencyToValue(undefined)).toBeNull();
    });
  });

  describe('getConsolidationPeriod', () => {
    it('daily: dia exato', () => {
      const p = getConsolidationPeriod('daily', new Date('2026-04-15T10:00:00'));
      expect(p.label).toBe('2026-04-15');
    });
    it('monthly: mês calendário', () => {
      const p = getConsolidationPeriod('monthly', new Date('2026-04-15T10:00:00'));
      expect(p.label).toBe('2026-04');
      expect(p.start.getDate()).toBe(1);
    });
    it('quarterly: Q correto', () => {
      const p = getConsolidationPeriod('quarterly', new Date('2026-05-15'));
      expect(p.label).toBe('2026-Q2');
    });
    it('semiannual: H1 jan-jun', () => {
      const p = getConsolidationPeriod('semiannual', new Date('2026-03-15'));
      expect(p.label).toBe('2026-H1');
      expect(p.start.getMonth()).toBe(0);
      expect(p.end.getMonth()).toBe(5);
    });
    it('semiannual: H2 jul-dez', () => {
      const p = getConsolidationPeriod('semiannual', new Date('2026-08-15'));
      expect(p.label).toBe('2026-H2');
      expect(p.start.getMonth()).toBe(6);
      expect(p.end.getMonth()).toBe(11);
    });
    it('annual: ano calendário', () => {
      const p = getConsolidationPeriod('annual', new Date('2026-07-04'));
      expect(p.label).toBe('2026');
    });
    it('biweekly: janela de 14 dias determinística', () => {
      const p1 = getConsolidationPeriod('biweekly', new Date('2026-01-10'));
      const p2 = getConsolidationPeriod('biweekly', new Date('2026-01-12'));
      // mesma janela
      expect(p1.label).toBe(p2.label);
    });
  });

  describe('suggestInputType', () => {
    it('retorna consolidated quando update == consolidation', () => {
      const kpi = {
        consolidation_frequency: 'monthly' as const,
        update_frequency: 'monthly' as const,
        frequency: 'monthly' as const,
      };
      expect(suggestInputType(kpi, new Date('2026-04-15'))).toBe('consolidated');
    });
    it('retorna partial para MRR (mensal × semanal) durante o mês', () => {
      const kpi = {
        consolidation_frequency: 'monthly' as const,
        update_frequency: 'weekly' as const,
        frequency: 'monthly' as const,
      };
      // Input feito no dia atual (período em aberto)
      expect(suggestInputType(kpi, new Date())).toBe('partial');
    });
    it('fallback para frequência legada quando v3 ausente', () => {
      const kpi = {
        consolidation_frequency: undefined,
        update_frequency: undefined,
        frequency: 'monthly' as const,
      };
      expect(suggestInputType(kpi, new Date())).toBe('consolidated');
    });
  });

  describe('FREQUENCY_DAYS ordenação', () => {
    it('mantém ordem ascendente canônica', () => {
      const order: Array<keyof typeof FREQUENCY_DAYS> = [
        'daily',
        'weekly',
        'biweekly',
        'monthly',
        'quarterly',
        'semiannual',
        'annual',
      ];
      const days = order.map((k) => FREQUENCY_DAYS[k]);
      const sorted = [...days].sort((a, b) => a - b);
      expect(days).toEqual(sorted);
    });
  });
});

describe('isKpiUpdateOverdue (Regra A)', () => {
  const NOW = new Date('2026-05-03T12:00:00Z');

  it('retorna false para KPI sem update_frequency (manual não revisado)', () => {
    expect(isKpiUpdateOverdue(null, '2020-01-01', NOW)).toBe(false);
    expect(isKpiUpdateOverdue(undefined, null, NOW)).toBe(false);
  });

  it('retorna true quando nunca houve valor lançado', () => {
    expect(isKpiUpdateOverdue('weekly', null, NOW)).toBe(true);
    expect(isKpiUpdateOverdue('monthly', undefined, NOW)).toBe(true);
  });

  it('retorna true para weekly com >7 dias e false para 2 dias', () => {
    const eightDaysAgo = new Date(NOW.getTime() - 8 * 86400000).toISOString();
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 86400000).toISOString();
    expect(isKpiUpdateOverdue('weekly', eightDaysAgo, NOW)).toBe(true);
    expect(isKpiUpdateOverdue('weekly', twoDaysAgo, NOW)).toBe(false);
  });

  it('retorna true para monthly com 31 dias e false para 20 dias', () => {
    const d31 = new Date(NOW.getTime() - 31 * 86400000).toISOString();
    const d20 = new Date(NOW.getTime() - 20 * 86400000).toISOString();
    expect(isKpiUpdateOverdue('monthly', d31, NOW)).toBe(true);
    expect(isKpiUpdateOverdue('monthly', d20, NOW)).toBe(false);
  });

  it('é resiliente a data inválida (trata como null)', () => {
    expect(isKpiUpdateOverdue('weekly', 'not-a-date', NOW)).toBe(true);
  });
});

describe('getMissingConsolidationPeriods (Regra B)', () => {
  const NOW = new Date('2026-05-03T12:00:00Z'); // dentro de 2026-05 (mês corrente)
  const KPI_CREATED = new Date('2025-01-01T00:00:00Z');

  it('retorna [] quando consolidation_frequency é null', () => {
    expect(
      getMissingConsolidationPeriods(null, [], { kpiCreatedAt: KPI_CREATED, now: NOW }),
    ).toEqual([]);
  });

  it('considera o mês corrente em aberto (não cobra)', () => {
    // Mensal, com 2026-04 e 2026-03 consolidados → nenhum período fechado faltando.
    // Lookback alcança meses de 2025; precisamos preencher tudo até KPI_CREATED.
    const labels: string[] = [];
    // Preenche 2025-01 .. 2026-04 (todos fechados)
    for (let y = 2025; y <= 2026; y++) {
      const maxMonth = y === 2026 ? 4 : 12;
      for (let m = 1; m <= maxMonth; m++) {
        labels.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
    expect(
      getMissingConsolidationPeriods('monthly', labels, {
        kpiCreatedAt: KPI_CREATED,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('detecta um período fechado faltante', () => {
    // Tudo consolidado exceto 2026-03
    const labels: string[] = [];
    for (let y = 2025; y <= 2026; y++) {
      const maxMonth = y === 2026 ? 4 : 12;
      for (let m = 1; m <= maxMonth; m++) {
        const lbl = `${y}-${String(m).padStart(2, '0')}`;
        if (lbl === '2026-03') continue;
        labels.push(lbl);
      }
    }
    const missing = getMissingConsolidationPeriods('monthly', labels, {
      kpiCreatedAt: KPI_CREATED,
      now: NOW,
    });
    expect(missing).toContain('2026-03');
    expect(missing.length).toBe(1);
  });

  it('detecta múltiplos períodos faltantes (KPI nunca consolidado)', () => {
    const missing = getMissingConsolidationPeriods('monthly', [], {
      kpiCreatedAt: new Date('2026-01-01T00:00:00Z'),
      now: NOW,
    });
    // 2026-04, 2026-03, 2026-02, 2026-01 (mês corrente 2026-05 está em aberto)
    expect(missing).toEqual(
      expect.arrayContaining(['2026-04', '2026-03', '2026-02', '2026-01']),
    );
  });

  it('respeita maxLookback como guardrail', () => {
    const missing = getMissingConsolidationPeriods('monthly', [], {
      kpiCreatedAt: new Date('2010-01-01T00:00:00Z'),
      now: NOW,
      maxLookback: 3,
    });
    expect(missing.length).toBeLessThanOrEqual(3);
  });

  it('não cobra períodos antes da criação do KPI', () => {
    const missing = getMissingConsolidationPeriods('monthly', [], {
      kpiCreatedAt: new Date('2026-04-15T00:00:00Z'),
      now: NOW,
    });
    // Só 2026-04 está fechado e depois da criação
    expect(missing).toEqual(['2026-04']);
  });
});

describe('isKpiConsolidationPending', () => {
  const NOW = new Date('2026-05-03T12:00:00Z');
  const KPI_CREATED = new Date('2026-01-01T00:00:00Z');

  it('true quando há ao menos um período fechado faltando', () => {
    expect(
      isKpiConsolidationPending('monthly', [], {
        kpiCreatedAt: KPI_CREATED,
        now: NOW,
      }),
    ).toBe(true);
  });

  it('false quando frequência é null', () => {
    expect(
      isKpiConsolidationPending(null, [], {
        kpiCreatedAt: KPI_CREATED,
        now: NOW,
      }),
    ).toBe(false);
  });
});
