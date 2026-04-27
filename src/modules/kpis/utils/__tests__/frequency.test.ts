import { describe, it, expect } from 'vitest';
import {
  FREQUENCY_DAYS,
  isUpdateFrequencyValid,
  getValidUpdateFrequencies,
  legacyFrequencyToValue,
  getConsolidationPeriod,
  suggestInputType,
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
