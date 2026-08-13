import { describe, it, expect } from 'vitest';
import { classifyKpiTrend, classifyKpiTrendSeries, type KpiTrendPoint } from '../trendClassification';

describe('classifyKpiTrend', () => {
  it('retorna null sem dados suficientes', () => {
    expect(classifyKpiTrend(null, 10, 'up')).toBeNull();
    expect(classifyKpiTrend(10, null, 'up')).toBeNull();
    expect(classifyKpiTrend(10, 0, 'up')).toBeNull();
  });

  it('direction=up: valor subindo é crescimento', () => {
    expect(classifyKpiTrend(120, 100, 'up')).toBe('growth');
    expect(classifyKpiTrend(80, 100, 'up')).toBe('decline');
  });

  it('direction=down: valor caindo é crescimento (melhora)', () => {
    expect(classifyKpiTrend(23, 25, 'down')).toBe('growth');
    expect(classifyKpiTrend(27, 25, 'down')).toBe('decline');
  });

  it('respeita a banda de estabilidade de ±2%', () => {
    expect(classifyKpiTrend(101, 100, 'up')).toBe('stable');
    expect(classifyKpiTrend(98.5, 100, 'up')).toBe('stable');
    expect(classifyKpiTrend(102.5, 100, 'up')).toBe('growth');
    expect(classifyKpiTrend(101, 100, 'down')).toBe('stable');
  });

  it('aceita banda customizada', () => {
    expect(classifyKpiTrend(103, 100, 'up', 5)).toBe('stable');
    expect(classifyKpiTrend(101, 100, 'up', 0.5)).toBe('growth');
  });

  it('trata valores anteriores negativos sem inverter o sinal', () => {
    expect(classifyKpiTrend(-50, -100, 'up')).toBe('growth');
  });
});

function series(values: number[]): KpiTrendPoint[] {
  return values.map((value, i) => ({
    value,
    reference_date: `2026-0${i + 1}-01`,
  }));
}

describe('classifyKpiTrendSeries', () => {
  it('retorna null com menos de 2 pontos', () => {
    expect(classifyKpiTrendSeries([], 'up')).toBeNull();
    expect(classifyKpiTrendSeries(series([100]), 'up')).toBeNull();
  });

  it('série crescente com direction=up é crescimento', () => {
    const result = classifyKpiTrendSeries(series([100, 110, 120, 130]), 'up');
    expect(result?.trend).toBe('growth');
    expect(result?.points).toBe(4);
    expect(result?.orientedPct).toBeGreaterThan(0);
  });

  it('série decrescente com direction=up é queda', () => {
    expect(classifyKpiTrendSeries(series([130, 120, 110, 100]), 'up')?.trend).toBe('decline');
  });

  it('série decrescente com direction=down é crescimento (melhora)', () => {
    expect(classifyKpiTrendSeries(series([30, 27, 24, 21]), 'down')?.trend).toBe('growth');
    expect(classifyKpiTrendSeries(series([21, 24, 27, 30]), 'down')?.trend).toBe('decline');
  });

  it('série plana é estabilidade', () => {
    expect(classifyKpiTrendSeries(series([100, 100.4, 99.8, 100.2]), 'up')?.trend).toBe('stable');
  });

  it('ordena por reference_date independentemente da ordem de entrada', () => {
    const unordered: KpiTrendPoint[] = [
      { value: 130, reference_date: '2026-04-01' },
      { value: 100, reference_date: '2026-01-01' },
      { value: 120, reference_date: '2026-03-01' },
      { value: 110, reference_date: '2026-02-01' },
    ];
    const result = classifyKpiTrendSeries(unordered, 'up');
    expect(result?.trend).toBe('growth');
    expect(result?.firstDate).toBe('2026-01-01');
    expect(result?.lastDate).toBe('2026-04-01');
  });

  it('com 2 pontos usa comparativo simples', () => {
    const result = classifyKpiTrendSeries(series([100, 120]), 'up');
    expect(result?.trend).toBe('growth');
    expect(result?.points).toBe(2);
    expect(result?.orientedPct).toBeCloseTo(20, 5);
  });

  it('ignora pontos com valores inválidos', () => {
    const withInvalid = [
      ...series([100, 110, 120]),
      { value: Number.NaN, reference_date: '2026-04-01' },
    ] as KpiTrendPoint[];
    expect(classifyKpiTrendSeries(withInvalid, 'up')?.points).toBe(3);
  });

  it('aceita banda customizada', () => {
    expect(classifyKpiTrendSeries(series([100, 101, 102, 103]), 'up', { bandPct: 10 })?.trend).toBe('stable');
  });
});
