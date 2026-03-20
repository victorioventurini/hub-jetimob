/**
 * Tests for Jet Experience metrics consistency (business rule validation)
 */
import { describe, it, expect } from 'vitest';
import {
  EVENT_TOTALS,
  CONVERSION_RATES,
  ROI_METRICS,
  FUNNEL_METRICS,
  EVENT_DISTRIBUTION,
  formatCurrencyBRL,
  formatCurrencyCompact,
} from './jetExperienceMetrics';

describe('EVENT_TOTALS consistency', () => {
  it('should have funnel values in descending order', () => {
    expect(EVENT_TOTALS.inscritos).toBeGreaterThan(EVENT_TOTALS.participantes);
    expect(EVENT_TOTALS.participantes).toBeGreaterThan(EVENT_TOTALS.leads);
    expect(EVENT_TOTALS.leads).toBeGreaterThan(EVENT_TOTALS.oportunidades);
    expect(EVENT_TOTALS.oportunidades).toBeGreaterThan(EVENT_TOTALS.contratos);
  });

  it('should match documented values', () => {
    expect(EVENT_TOTALS.inscritos).toBe(925);
    expect(EVENT_TOTALS.participantes).toBe(881);
    expect(EVENT_TOTALS.leads).toBe(176);
    expect(EVENT_TOTALS.oportunidades).toBe(32);
    expect(EVENT_TOTALS.contratos).toBe(6);
  });
});

describe('CONVERSION_RATES consistency', () => {
  it('should match computed ratios from EVENT_TOTALS', () => {
    expect(CONVERSION_RATES.showRate).toBeCloseTo(EVENT_TOTALS.participantes / EVENT_TOTALS.inscritos, 4);
    expect(CONVERSION_RATES.leadsRate).toBeCloseTo(EVENT_TOTALS.leads / EVENT_TOTALS.participantes, 4);
    expect(CONVERSION_RATES.oppsRate).toBeCloseTo(EVENT_TOTALS.oportunidades / EVENT_TOTALS.leads, 4);
    expect(CONVERSION_RATES.contratosRate).toBeCloseTo(EVENT_TOTALS.contratos / EVENT_TOTALS.oportunidades, 4);
  });

  it('should all be between 0 and 1', () => {
    Object.values(CONVERSION_RATES).forEach(rate => {
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });
});

describe('ROI_METRICS consistency', () => {
  it('should have ltvTotal = contratos × ltvPerContrato', () => {
    expect(ROI_METRICS.ltvTotal).toBe(EVENT_TOTALS.contratos * ROI_METRICS.ltvPerContrato);
  });
});

describe('FUNNEL_METRICS consistency', () => {
  it('should have 5 stages', () => {
    expect(FUNNEL_METRICS).toHaveLength(5);
  });

  it('should match EVENT_TOTALS values', () => {
    expect(FUNNEL_METRICS[0].value).toBe(EVENT_TOTALS.inscritos);
    expect(FUNNEL_METRICS[1].value).toBe(EVENT_TOTALS.participantes);
    expect(FUNNEL_METRICS[2].value).toBe(EVENT_TOTALS.leads);
    expect(FUNNEL_METRICS[3].value).toBe(EVENT_TOTALS.oportunidades);
    expect(FUNNEL_METRICS[4].value).toBe(EVENT_TOTALS.contratos);
  });
});

describe('EVENT_DISTRIBUTION consistency', () => {
  it('should sum leads to EVENT_TOTALS.leads', () => {
    const totalLeads = EVENT_DISTRIBUTION.reduce((sum, e) => sum + e.leads, 0);
    expect(totalLeads).toBe(EVENT_TOTALS.leads);
  });

  it('should sum opps to EVENT_TOTALS.oportunidades', () => {
    const totalOpps = EVENT_DISTRIBUTION.reduce((sum, e) => sum + e.opps, 0);
    expect(totalOpps).toBe(EVENT_TOTALS.oportunidades);
  });
});

describe('formatCurrencyBRL', () => {
  it('should format as BRL currency', () => {
    const result = formatCurrencyBRL(1500);
    expect(result).toContain('1.500');
    expect(result).toMatch(/R\$/);
  });

  it('should handle zero', () => {
    const result = formatCurrencyBRL(0);
    expect(result).toMatch(/R\$/);
  });
});

describe('formatCurrencyCompact', () => {
  it('should format large values compactly', () => {
    const result = formatCurrencyCompact(885000);
    expect(result).toMatch(/R\$/);
    // Should contain compact notation (mil, K, etc.)
    expect(result.length).toBeLessThan(15);
  });
});
