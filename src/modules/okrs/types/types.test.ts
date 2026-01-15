/**
 * OKR Types Tests
 * 
 * Tests for OKR type definitions and utility functions from types.ts.
 * Ensures type structures are correct and calculateProgress works as expected.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProgress,
  type OkrStatus,
  type OkrRagStatus,
  type OkrKrType,
  type OkrDirection,
  type OkrConfidence,
  type OkrDependencyStatus,
  type OkrReportFrequency,
  type OkrChannel,
  type OkrContributionEntityType,
  type OkrMetricRole,
} from '../types';

// ============================================================
// Type Value Tests
// ============================================================

describe('OKR Type Values', () => {
  describe('OkrStatus', () => {
    it('should accept valid status values', () => {
      const validStatuses: OkrStatus[] = ['draft', 'active', 'completed', 'cancelled', 'discarded'];
      expect(validStatuses).toHaveLength(5);
      validStatuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('OkrRagStatus', () => {
    it('should accept valid RAG status values', () => {
      const validRagStatuses: OkrRagStatus[] = ['green', 'yellow', 'red', 'not_started'];
      expect(validRagStatuses).toHaveLength(4);
    });

    it('should represent traffic light colors plus not_started', () => {
      const ragStatuses: OkrRagStatus[] = ['green', 'yellow', 'red', 'not_started'];
      expect(ragStatuses).toContain('green');
      expect(ragStatuses).toContain('yellow');
      expect(ragStatuses).toContain('red');
      expect(ragStatuses).toContain('not_started');
    });
  });

  describe('OkrKrType', () => {
    it('should accept valid KR type values', () => {
      const validKrTypes: OkrKrType[] = ['contribution', 'enabler', 'foundational'];
      expect(validKrTypes).toHaveLength(3);
    });
  });

  describe('OkrDirection', () => {
    it('should accept up and down directions', () => {
      const validDirections: OkrDirection[] = ['up', 'down'];
      expect(validDirections).toHaveLength(2);
    });
  });

  describe('OkrConfidence', () => {
    it('should accept high, medium, low confidence levels', () => {
      const validConfidences: OkrConfidence[] = ['high', 'medium', 'low'];
      expect(validConfidences).toHaveLength(3);
    });
  });

  describe('OkrDependencyStatus', () => {
    it('should accept valid dependency status values', () => {
      const validDependencyStatuses: OkrDependencyStatus[] = ['ok', 'blocked', 'at_risk'];
      expect(validDependencyStatuses).toHaveLength(3);
    });
  });

  describe('OkrReportFrequency', () => {
    it('should accept valid report frequency values', () => {
      const validFrequencies: OkrReportFrequency[] = ['weekly', 'monthly', 'quarterly', 'event'];
      expect(validFrequencies).toHaveLength(4);
    });
  });

  describe('OkrChannel', () => {
    it('should accept valid channel values', () => {
      const validChannels: OkrChannel[] = ['email', 'slack', 'both'];
      expect(validChannels).toHaveLength(3);
    });
  });

  describe('OkrContributionEntityType', () => {
    it('should accept objective and kr types', () => {
      const validEntityTypes: OkrContributionEntityType[] = ['objective', 'kr'];
      expect(validEntityTypes).toHaveLength(2);
    });
  });

  describe('OkrMetricRole', () => {
    it('should accept primary and guardrail roles', () => {
      const validRoles: OkrMetricRole[] = ['primary', 'guardrail'];
      expect(validRoles).toHaveLength(2);
    });
  });
});

// ============================================================
// calculateProgress Function Tests
// ============================================================

describe('calculateProgress', () => {
  describe('basic calculations - direction up', () => {
    it('should return 0 when no progress made', () => {
      expect(calculateProgress(0, 0, 100, 'up')).toBe(0);
    });

    it('should return 100 when target reached', () => {
      expect(calculateProgress(0, 100, 100, 'up')).toBe(100);
    });

    it('should return 50 at midpoint', () => {
      expect(calculateProgress(0, 50, 100, 'up')).toBe(50);
    });

    it('should handle custom baseline', () => {
      // From 20 to 100 (range of 80), currently at 60 = 50% progress
      expect(calculateProgress(20, 60, 100, 'up')).toBe(50);
    });

    it('should handle small targets', () => {
      expect(calculateProgress(0, 5, 10, 'up')).toBe(50);
    });

    it('should handle large targets', () => {
      expect(calculateProgress(0, 500000, 1000000, 'up')).toBe(50);
    });
  });

  describe('basic calculations - direction down', () => {
    it('should return 0 when no progress made', () => {
      expect(calculateProgress(100, 100, 0, 'down')).toBe(0);
    });

    it('should return 100 when target reached', () => {
      expect(calculateProgress(100, 0, 0, 'down')).toBe(100);
    });

    it('should return 50 at midpoint', () => {
      expect(calculateProgress(100, 50, 0, 'down')).toBe(50);
    });

    it('should handle non-zero target', () => {
      // From 100 to 20 (range of 80), currently at 60 = 50% progress
      expect(calculateProgress(100, 60, 20, 'down')).toBe(50);
    });
  });

  describe('clamping behavior', () => {
    it('should clamp negative progress to 0 (up direction)', () => {
      // Current is below baseline
      expect(calculateProgress(50, 30, 100, 'up')).toBe(0);
    });

    it('should clamp over 100% progress to 100 (up direction)', () => {
      // Current exceeds target
      expect(calculateProgress(0, 150, 100, 'up')).toBe(100);
    });

    it('should clamp negative progress to 0 (down direction)', () => {
      // Current went up instead of down
      expect(calculateProgress(100, 150, 0, 'down')).toBe(0);
    });

    it('should clamp over 100% progress to 100 (down direction)', () => {
      // Current went below target
      expect(calculateProgress(100, -50, 0, 'down')).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle same baseline and target (up) - at target', () => {
      expect(calculateProgress(100, 100, 100, 'up')).toBe(100);
    });

    it('should handle same baseline and target (up) - below', () => {
      expect(calculateProgress(100, 50, 100, 'up')).toBe(0);
    });

    it('should handle same baseline and target (down) - at target', () => {
      expect(calculateProgress(50, 50, 50, 'down')).toBe(100);
    });

    it('should handle same baseline and target (down) - above', () => {
      expect(calculateProgress(50, 100, 50, 'down')).toBe(0);
    });

    it('should handle zero values for all parameters', () => {
      expect(calculateProgress(0, 0, 0, 'up')).toBe(100); // At target
    });

    it('should handle negative numbers (debt reduction)', () => {
      // Reducing debt from -1000 to -500
      expect(calculateProgress(-1000, -750, -500, 'up')).toBe(50);
    });
  });

  describe('decimal precision', () => {
    it('should handle decimal baselines', () => {
      expect(calculateProgress(0.5, 0.75, 1.0, 'up')).toBe(50);
    });

    it('should handle decimal targets', () => {
      expect(calculateProgress(0, 1.5, 3.0, 'up')).toBe(50);
    });

    it('should maintain reasonable precision', () => {
      const progress = calculateProgress(0, 33, 100, 'up');
      expect(progress).toBe(33);
    });

    it('should handle very small decimals', () => {
      const progress = calculateProgress(0.001, 0.0015, 0.002, 'up');
      expect(progress).toBe(50);
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate NPS improvement correctly', () => {
      // NPS from 30 to 50, currently at 40
      expect(calculateProgress(30, 40, 50, 'up')).toBe(50);
    });

    it('should calculate churn reduction correctly', () => {
      // Churn from 8% to 4%, currently at 6%
      expect(calculateProgress(8, 6, 4, 'down')).toBe(50);
    });

    it('should calculate revenue growth correctly', () => {
      // Revenue from 1M to 1.5M, currently at 1.25M
      expect(calculateProgress(1000000, 1250000, 1500000, 'up')).toBe(50);
    });

    it('should calculate cost reduction correctly', () => {
      // Costs from 500k to 400k, currently at 450k
      expect(calculateProgress(500000, 450000, 400000, 'down')).toBe(50);
    });

    it('should calculate response time reduction correctly', () => {
      // Response time from 2000ms to 500ms, currently at 1250ms
      expect(calculateProgress(2000, 1250, 500, 'down')).toBe(50);
    });
  });
});

// ============================================================
// Interface Structure Tests
// ============================================================

describe('OKR Interface Structures', () => {
  it('should validate OkrOrgObjective structure', () => {
    const objective = {
      id: 'obj-1',
      title: 'Increase Revenue',
      description: 'Description',
      year: 2025,
      owner_user_id: 'user-1',
      status: 'active' as OkrStatus,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    expect(objective.id).toBeDefined();
    expect(objective.title).toBeDefined();
    expect(objective.year).toBe(2025);
    expect(objective.status).toBe('active');
  });

  it('should validate OkrTeamKeyResult structure', () => {
    const kr = {
      id: 'kr-1',
      team_objective_id: 'obj-1',
      parent_kr_id: null,
      team_id: 'team-1',
      title: 'Achieve 50 new customers',
      type: 'contribution' as OkrKrType,
      baseline: 0,
      current_value: 25,
      target: 50,
      direction: 'up' as OkrDirection,
      unit: 'customers',
      owner_user_id: 'user-1',
      co_responsibles: ['user-2', 'user-3'],
      status: 'yellow' as OkrRagStatus,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };

    expect(kr.id).toBeDefined();
    expect(kr.team_id).toBeDefined();
    expect(kr.baseline).toBe(0);
    expect(kr.target).toBe(50);
    expect(kr.direction).toBe('up');
    expect(kr.co_responsibles).toHaveLength(2);
  });

  it('should validate OkrCheckin structure', () => {
    const checkin = {
      id: 'checkin-1',
      kr_id: 'kr-1',
      date: '2025-01-15',
      previous_value: 20,
      current_value: 25,
      confidence: 'medium' as OkrConfidence,
      blockers: 'Waiting for marketing approval',
      comments: 'Good progress this week',
      user_id: 'user-1',
      created_at: '2025-01-15T10:00:00Z',
    };

    expect(checkin.id).toBeDefined();
    expect(checkin.kr_id).toBeDefined();
    expect(checkin.current_value).toBe(25);
    expect(checkin.confidence).toBe('medium');
  });

  it('should validate OkrDependency structure', () => {
    const dependency = {
      id: 'dep-1',
      kr_id: 'kr-1',
      depends_on_team_id: 'team-2',
      depends_on_kr_id: 'kr-5',
      description: 'Need API integration from platform team',
      status: 'at_risk' as OkrDependencyStatus,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
    };

    expect(dependency.id).toBeDefined();
    expect(dependency.kr_id).toBeDefined();
    expect(dependency.status).toBe('at_risk');
  });
});
