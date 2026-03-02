/**
 * Tests for KPI value mapping logic extracted from useKpiData and useKpiWithHistory.
 * Tests pure functions without React hooks.
 */
import { describe, it, expect } from 'vitest';
import { calculateRagStatus } from '../../types';

// Extracted mapping logic (mirrors useKpiData lines 183-194 and useKpiWithHistory lines 133-143)
function computeTrendAndVariation(
  currentValue: number | null,
  previousValue: number | null
): { trend: 'up' | 'down' | 'stable'; variation: number | null } {
  let variation: number | null = null;
  let trend: 'up' | 'down' | 'stable' = 'stable';

  if (currentValue !== null && previousValue !== null && previousValue !== 0) {
    variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    if (variation > 0.5) trend = 'up';
    else if (variation < -0.5) trend = 'down';
  }

  return { trend, variation };
}

describe('KPI value mapping logic', () => {
  describe('current_value extraction', () => {
    it('uses first value from sorted array', () => {
      const values = [
        { value: 42, reference_date: '2026-03-01' },
        { value: 30, reference_date: '2026-02-01' },
      ];
      const currentValue = values[0]?.value ?? null;
      expect(currentValue).toBe(42);
    });

    it('preserves 0 as current_value (not null)', () => {
      const values = [
        { value: 0, reference_date: '2026-03-01' },
        { value: 10, reference_date: '2026-02-01' },
      ];
      const currentValue = values[0]?.value ?? null;
      expect(currentValue).toBe(0);
      expect(currentValue).not.toBeNull();
    });

    it('returns null when no values exist', () => {
      const values: { value: number; reference_date: string }[] = [];
      const currentValue = values[0]?.value ?? null;
      expect(currentValue).toBeNull();
    });
  });

  describe('trend and variation', () => {
    it('returns stable when previousValue is null', () => {
      const result = computeTrendAndVariation(100, null);
      expect(result.trend).toBe('stable');
      expect(result.variation).toBeNull();
    });

    it('returns stable when currentValue is null', () => {
      const result = computeTrendAndVariation(null, 100);
      expect(result.trend).toBe('stable');
      expect(result.variation).toBeNull();
    });

    it('calculates variation correctly with positive values', () => {
      // 100 → 120 = +20%
      const result = computeTrendAndVariation(120, 100);
      expect(result.variation).toBeCloseTo(20);
      expect(result.trend).toBe('up');
    });

    it('detects downward trend', () => {
      // 100 → 50 = -50%
      const result = computeTrendAndVariation(50, 100);
      expect(result.variation).toBeCloseTo(-50);
      expect(result.trend).toBe('down');
    });

    it('returns stable for tiny variation within threshold', () => {
      // 100 → 100.3 = +0.3% (below 0.5 threshold)
      const result = computeTrendAndVariation(100.3, 100);
      expect(result.trend).toBe('stable');
    });

    it('does not cause division by zero when previousValue is 0', () => {
      const result = computeTrendAndVariation(10, 0);
      expect(result.trend).toBe('stable');
      expect(result.variation).toBeNull();
    });

    it('handles currentValue = 0 with positive previousValue', () => {
      // 100 → 0 = -100%
      const result = computeTrendAndVariation(0, 100);
      expect(result.variation).toBeCloseTo(-100);
      expect(result.trend).toBe('down');
    });
  });

  describe('RAG status with zero values', () => {
    it('returns off_track when current_value = 0 and target_value > 0 (direction up)', () => {
      expect(calculateRagStatus(0, 100, 'up')).toBe('off_track');
    });

    it('does NOT return no_data for current_value = 0', () => {
      expect(calculateRagStatus(0, 50, 'up')).not.toBe('no_data');
    });

    it('returns no_data only when values are actually null', () => {
      expect(calculateRagStatus(null, 100, 'up')).toBe('no_data');
      expect(calculateRagStatus(50, null, 'up')).toBe('no_data');
    });
  });
});
