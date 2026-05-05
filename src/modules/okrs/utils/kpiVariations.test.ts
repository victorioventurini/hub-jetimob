import { describe, it, expect } from 'vitest';
import {
  variationVsLast,
  variationVsTarget,
  orientedDeltaPct,
  classifyKpiDelta,
  isKpiImprovement,
} from './kpiVariations';

describe('kpiVariations — direction-aware', () => {
  it('variationVsLast handles nulls and zero', () => {
    expect(variationVsLast(null, 10)).toBeNull();
    expect(variationVsLast(10, null)).toBeNull();
    expect(variationVsLast(10, 0)).toBeNull();
    expect(variationVsLast(120, 100)).toBe(20);
  });

  it('variationVsTarget handles nulls and zero', () => {
    expect(variationVsTarget(null, 10)).toBeNull();
    expect(variationVsTarget(10, 0)).toBeNull();
    expect(variationVsTarget(80, 100)).toBe(-20);
  });

  it('orientedDeltaPct inverts for direction=down', () => {
    expect(orientedDeltaPct(20, 'up')).toBe(20);
    expect(orientedDeltaPct(20, 'down')).toBe(-20);
    expect(orientedDeltaPct(-15, 'down')).toBe(15);
    expect(orientedDeltaPct(10, 'maintain')).toBe(10);
    expect(orientedDeltaPct(10, null)).toBe(10);
    expect(orientedDeltaPct(null, 'down')).toBeNull();
  });

  it('classifyKpiDelta uses oriented sign', () => {
    expect(classifyKpiDelta(20, 'up')).toBe('improvement');
    expect(classifyKpiDelta(20, 'down')).toBe('regression');
    expect(classifyKpiDelta(-10, 'down')).toBe('improvement');
    expect(classifyKpiDelta(0, 'up')).toBe('flat');
    expect(classifyKpiDelta(null, 'up')).toBeNull();
    expect(classifyKpiDelta(15, undefined)).toBe('improvement');
  });

  it('isKpiImprovement matches classify', () => {
    expect(isKpiImprovement(20, 'down')).toBe(false);
    expect(isKpiImprovement(-20, 'down')).toBe(true);
    expect(isKpiImprovement(0, 'up')).toBe(false);
    expect(isKpiImprovement(null, 'up')).toBeNull();
  });
});
