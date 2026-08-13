import { describe, it, expect } from 'vitest';
import { classifyKpiTrend } from '../trendClassification';

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
