import { describe, it, expect } from 'vitest';
import { calculateRagStatus } from '../types';

describe('calculateRagStatus', () => {
  // === no_data cases ===
  it('returns no_data when currentValue is null', () => {
    expect(calculateRagStatus(null, 100, 'up')).toBe('no_data');
  });

  it('returns no_data when targetValue is null', () => {
    expect(calculateRagStatus(80, null, 'up')).toBe('no_data');
  });

  it('returns no_data when both values are null', () => {
    expect(calculateRagStatus(null, null, 'up')).toBe('no_data');
  });

  // === direction "up" (higher is better) ===
  describe('direction "up"', () => {
    it('returns on_track when value >= 90% of target', () => {
      expect(calculateRagStatus(90, 100, 'up')).toBe('on_track');
      expect(calculateRagStatus(100, 100, 'up')).toBe('on_track');
      expect(calculateRagStatus(120, 100, 'up')).toBe('on_track');
    });

    it('returns at_risk when value is 70-89% of target', () => {
      expect(calculateRagStatus(70, 100, 'up')).toBe('at_risk');
      expect(calculateRagStatus(80, 100, 'up')).toBe('at_risk');
      expect(calculateRagStatus(89, 100, 'up')).toBe('at_risk');
    });

    it('returns off_track when value < 70% of target', () => {
      expect(calculateRagStatus(50, 100, 'up')).toBe('off_track');
      expect(calculateRagStatus(69, 100, 'up')).toBe('off_track');
    });
  });

  // === direction "down" (lower is better) ===
  describe('direction "down"', () => {
    it('returns on_track when value is low enough (target/current >= 90%)', () => {
      // target=5, current=5 → 5/5=100% → on_track
      expect(calculateRagStatus(5, 5, 'down')).toBe('on_track');
      // target=5, current=5.5 → 5/5.5=90.9% → on_track
      expect(calculateRagStatus(5.5, 5, 'down')).toBe('on_track');
    });

    it('returns at_risk when value is moderately above target', () => {
      // target=5, current=7 → 5/7=71.4% → at_risk
      expect(calculateRagStatus(7, 5, 'down')).toBe('at_risk');
    });

    it('returns off_track when value is well above target', () => {
      // target=5, current=10 → 5/10=50% → off_track
      expect(calculateRagStatus(10, 5, 'down')).toBe('off_track');
    });
  });

  // === Zero value edge cases (critical for bug fix) ===
  describe('zero value handling', () => {
    it('returns off_track when currentValue is 0 and targetValue > 0 (direction up)', () => {
      // 0/100 = 0% → off_track, NOT no_data
      expect(calculateRagStatus(0, 100, 'up')).toBe('off_track');
    });

    it('handles targetValue = 0 with direction up (division by zero)', () => {
      // 0/0 = NaN → will be off_track since NaN < 70
      const result = calculateRagStatus(50, 0, 'up');
      // NaN comparisons return false, so it falls to off_track
      expect(['on_track', 'at_risk', 'off_track']).toContain(result);
    });

    it('handles currentValue = 0 with direction down (division by zero)', () => {
      // target/0 = Infinity → will be on_track since Infinity >= 90
      const result = calculateRagStatus(0, 5, 'down');
      expect(['on_track', 'at_risk', 'off_track']).toContain(result);
    });

    it('treats 0 as a valid value, not as no_data', () => {
      expect(calculateRagStatus(0, 0, 'up')).not.toBe('no_data');
      expect(calculateRagStatus(0, 100, 'down')).not.toBe('no_data');
    });
  });
});
