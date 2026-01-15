/**
 * useOkrDashboardData Hook Tests
 * 
 * Tests for dashboard data utilities: deriveStatusCounts and calculateOverallProgress.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveStatusCounts,
  calculateOverallProgress,
  type OkrDashboardView,
  type OkrDashboardParams,
  type OkrDashboardData,
  type SharedOkrInsights,
} from './useOkrDashboardData';

// ============================================================
// deriveStatusCounts Tests
// ============================================================

describe('deriveStatusCounts', () => {
  it('should return zero counts for empty array', () => {
    const result = deriveStatusCounts([]);
    expect(result).toEqual({
      on_track: 0,
      at_risk: 0,
      off_track: 0,
      achieved: 0,
      not_started: 0,
      total: 0,
    });
  });

  it('should count single status correctly', () => {
    const krs = [
      { status: 'on_track' },
      { status: 'on_track' },
      { status: 'on_track' },
    ];
    const result = deriveStatusCounts(krs);
    expect(result.on_track).toBe(3);
    expect(result.total).toBe(3);
  });

  it('should count mixed statuses correctly', () => {
    const krs = [
      { status: 'on_track' },
      { status: 'at_risk' },
      { status: 'off_track' },
      { status: 'achieved' },
      { status: 'not_started' },
    ];
    const result = deriveStatusCounts(krs);
    expect(result.on_track).toBe(1);
    expect(result.at_risk).toBe(1);
    expect(result.off_track).toBe(1);
    expect(result.achieved).toBe(1);
    expect(result.not_started).toBe(1);
    expect(result.total).toBe(5);
  });

  it('should handle unknown statuses gracefully', () => {
    const krs = [
      { status: 'on_track' },
      { status: 'unknown_status' },
      { status: 'at_risk' },
    ];
    const result = deriveStatusCounts(krs);
    expect(result.on_track).toBe(1);
    expect(result.at_risk).toBe(1);
    expect(result.total).toBe(3);
    // Unknown status should not be counted in any category
  });

  it('should handle large datasets', () => {
    const krs = Array.from({ length: 100 }, (_, i) => ({
      status: i % 2 === 0 ? 'on_track' : 'at_risk',
    }));
    const result = deriveStatusCounts(krs);
    expect(result.on_track).toBe(50);
    expect(result.at_risk).toBe(50);
    expect(result.total).toBe(100);
  });

  it('should handle real-world distribution', () => {
    const krs = [
      // 60% on track (typical healthy team)
      ...Array(6).fill({ status: 'on_track' }),
      // 20% at risk
      ...Array(2).fill({ status: 'at_risk' }),
      // 10% off track
      { status: 'off_track' },
      // 10% achieved
      { status: 'achieved' },
    ];
    const result = deriveStatusCounts(krs);
    expect(result.on_track).toBe(6);
    expect(result.at_risk).toBe(2);
    expect(result.off_track).toBe(1);
    expect(result.achieved).toBe(1);
    expect(result.total).toBe(10);
  });
});

// ============================================================
// calculateOverallProgress Tests
// ============================================================

describe('calculateOverallProgress', () => {
  describe('empty and null handling', () => {
    it('should return 0 for empty array', () => {
      expect(calculateOverallProgress([])).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(calculateOverallProgress(undefined as unknown as [])).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(calculateOverallProgress(null as unknown as [])).toBe(0);
    });
  });

  describe('direction up calculations', () => {
    it('should return 0 when no progress made', () => {
      const krs = [{ baseline: 0, current_value: 0, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(0);
    });

    it('should return 100 when target reached', () => {
      const krs = [{ baseline: 0, current_value: 100, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(100);
    });

    it('should return 50 at midpoint', () => {
      const krs = [{ baseline: 0, current_value: 50, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should clamp to 100 when exceeding target', () => {
      const krs = [{ baseline: 0, current_value: 150, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(100);
    });

    it('should clamp to 0 when below baseline', () => {
      const krs = [{ baseline: 50, current_value: 30, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(0);
    });
  });

  describe('direction down calculations', () => {
    it('should return 0 when no progress made', () => {
      const krs = [{ baseline: 100, current_value: 100, target: 0, direction: 'down' }];
      expect(calculateOverallProgress(krs)).toBe(0);
    });

    it('should return 100 when target reached', () => {
      const krs = [{ baseline: 100, current_value: 0, target: 0, direction: 'down' }];
      expect(calculateOverallProgress(krs)).toBe(100);
    });

    it('should return 50 at midpoint', () => {
      const krs = [{ baseline: 100, current_value: 50, target: 0, direction: 'down' }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should handle churn reduction scenario', () => {
      // Churn from 8% to 4%, currently at 6%
      const krs = [{ baseline: 8, current_value: 6, target: 4, direction: 'down' }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });
  });

  describe('average across multiple KRs', () => {
    it('should average progress across KRs', () => {
      const krs = [
        { baseline: 0, current_value: 100, target: 100, direction: 'up' }, // 100%
        { baseline: 0, current_value: 0, target: 100, direction: 'up' },   // 0%
      ];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should handle mixed directions', () => {
      const krs = [
        { baseline: 0, current_value: 50, target: 100, direction: 'up' },    // 50%
        { baseline: 100, current_value: 50, target: 0, direction: 'down' }, // 50%
      ];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should average multiple KRs with different progress', () => {
      const krs = [
        { baseline: 0, current_value: 25, target: 100, direction: 'up' },  // 25%
        { baseline: 0, current_value: 50, target: 100, direction: 'up' },  // 50%
        { baseline: 0, current_value: 75, target: 100, direction: 'up' },  // 75%
        { baseline: 0, current_value: 100, target: 100, direction: 'up' }, // 100%
      ];
      expect(calculateOverallProgress(krs)).toBe(62.5);
    });
  });

  describe('edge cases', () => {
    it('should handle string values for numbers', () => {
      const krs = [{ baseline: '0', current_value: '50', target: '100', direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should handle null values', () => {
      const krs = [{ baseline: null, current_value: 50, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should handle undefined direction (defaults to up)', () => {
      const krs = [{ baseline: 0, current_value: 50, target: 100 }];
      expect(calculateOverallProgress(krs)).toBe(50);
    });

    it('should handle zero range (target equals baseline) - at target', () => {
      const krs = [{ baseline: 100, current_value: 100, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(100);
    });

    it('should handle zero range (target equals baseline) - below', () => {
      const krs = [{ baseline: 100, current_value: 50, target: 100, direction: 'up' }];
      expect(calculateOverallProgress(krs)).toBe(0);
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate quarterly team OKR progress', () => {
      const krs = [
        // NPS: 30 -> 50, currently 42
        { baseline: 30, current_value: 42, target: 50, direction: 'up' },  // 60%
        // Revenue: 1M -> 1.5M, currently 1.25M
        { baseline: 1000000, current_value: 1250000, target: 1500000, direction: 'up' }, // 50%
        // Churn: 5% -> 3%, currently 4%
        { baseline: 5, current_value: 4, target: 3, direction: 'down' },  // 50%
        // Response time: 2000ms -> 500ms, currently 1000ms
        { baseline: 2000, current_value: 1000, target: 500, direction: 'down' }, // 66.67%
      ];
      const progress = calculateOverallProgress(krs);
      expect(progress).toBeCloseTo(56.67, 1);
    });
  });
});

// ============================================================
// Type Structure Tests
// ============================================================

describe('Dashboard Type Structures', () => {
  describe('OkrDashboardView', () => {
    it('should accept valid view values', () => {
      const views: OkrDashboardView[] = ['company', 'team', 'my'];
      expect(views).toHaveLength(3);
    });
  });

  describe('OkrDashboardParams', () => {
    it('should accept valid params structure', () => {
      const params: OkrDashboardParams = {
        year: 2025,
        view: 'team',
        teamId: 'team-123',
      };
      expect(params.year).toBe(2025);
      expect(params.view).toBe('team');
      expect(params.teamId).toBe('team-123');
    });

    it('should accept empty params', () => {
      const params: OkrDashboardParams = {};
      expect(params.year).toBeUndefined();
      expect(params.view).toBeUndefined();
    });
  });

  describe('SharedOkrInsights', () => {
    it('should have correct structure', () => {
      const insights: SharedOkrInsights = {
        shared_okrs_count: 5,
        total_team_krs: 20,
        overdue_shared_count: 2,
      };
      expect(insights.shared_okrs_count).toBe(5);
      expect(insights.total_team_krs).toBe(20);
      expect(insights.overdue_shared_count).toBe(2);
    });
  });

  describe('OkrDashboardData', () => {
    it('should have correct meta structure', () => {
      const dashboardData: Partial<OkrDashboardData> = {
        meta: {
          bu_id: 'bu-123',
          year: 2025,
          view: 'company',
          team_id: null,
          fetched_at: '2025-01-15T10:00:00Z',
        },
      };
      expect(dashboardData.meta?.bu_id).toBe('bu-123');
      expect(dashboardData.meta?.year).toBe(2025);
    });
  });
});
