/**
 * Health Score Tests
 * 
 * Tests for objective health calculation functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateObjectiveHealth,
  getHealthLevelConfig,
  type HealthLevel,
} from './healthScore';
import { createMockKr, createMockInitiative, createMockCycle, FIXTURES } from '@/test/mocks/fixtures';

describe('calculateObjectiveHealth', () => {
  describe('with empty inputs', () => {
    it('should return score 0 with no KRs or initiatives', () => {
      const result = calculateObjectiveHealth({
        krs: [],
        initiatives: [],
        cycle: null,
      });
      expect(result.score).toBe(0);
      expect(result.factors).toHaveLength(0);
    });
  });

  describe('KR progress factor', () => {
    it('should calculate average KR progress correctly for "up" direction', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ current_value: 80, baseline: 0, target: 100, direction: 'up' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const progressFactor = result.factors.find(f => f.id === 'kr_progress');
      expect(progressFactor).toBeDefined();
      expect(progressFactor?.score).toBe(80);
      expect(progressFactor?.status).toBe('good');
    });

    it('should calculate progress correctly for "down" direction', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ current_value: 3, baseline: 10, target: 2, direction: 'down' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      // Progress: (10 - 3) / (10 - 2) = 7/8 = 87.5%
      const progressFactor = result.factors.find(f => f.id === 'kr_progress');
      expect(progressFactor).toBeDefined();
      expect(progressFactor?.score).toBeCloseTo(87.5, 1);
    });

    it('should average multiple KRs', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ current_value: 100, baseline: 0, target: 100, direction: 'up' }), // 100%
          createMockKr({ current_value: 0, baseline: 0, target: 100, direction: 'up' }),   // 0%
        ],
        initiatives: [],
        cycle: null,
      });
      
      const progressFactor = result.factors.find(f => f.id === 'kr_progress');
      expect(progressFactor?.score).toBe(50);
    });

    it('should clamp progress between 0 and 100', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ current_value: 150, baseline: 0, target: 100, direction: 'up' }), // >100%
        ],
        initiatives: [],
        cycle: null,
      });
      
      const progressFactor = result.factors.find(f => f.id === 'kr_progress');
      expect(progressFactor?.score).toBe(100);
    });

    it('should handle baseline equal to target for "up" direction', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ current_value: 100, baseline: 100, target: 100, direction: 'up' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const progressFactor = result.factors.find(f => f.id === 'kr_progress');
      expect(progressFactor?.score).toBe(100); // current >= target
    });
  });

  describe('RAG status factor', () => {
    it('should score 100 when all KRs are green', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ status: 'green' }),
          createMockKr({ status: 'green' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const ragFactor = result.factors.find(f => f.id === 'rag_status');
      expect(ragFactor?.score).toBe(100);
      expect(ragFactor?.status).toBe('good');
    });

    it('should score 0 when all KRs are red', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ status: 'red' }),
          createMockKr({ status: 'red' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const ragFactor = result.factors.find(f => f.id === 'rag_status');
      expect(ragFactor?.score).toBe(0);
      expect(ragFactor?.status).toBe('bad');
    });

    it('should score 50 for yellow KRs', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ status: 'yellow' }),
          createMockKr({ status: 'yellow' }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const ragFactor = result.factors.find(f => f.id === 'rag_status');
      expect(ragFactor?.score).toBe(50);
      expect(ragFactor?.status).toBe('warning');
    });

    it('should calculate mixed RAG status correctly', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ status: 'green' }),  // 100
          createMockKr({ status: 'yellow' }), // 50
          createMockKr({ status: 'red' }),    // 0
        ],
        initiatives: [],
        cycle: null,
      });
      
      const ragFactor = result.factors.find(f => f.id === 'rag_status');
      expect(ragFactor?.score).toBe(50); // (100 + 50 + 0) / 3
      expect(ragFactor?.message).toContain('1 verde');
      expect(ragFactor?.message).toContain('1 amarelo');
      expect(ragFactor?.message).toContain('1 vermelho');
    });
  });

  describe('check-in frequency factor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should score 100 when all KRs have recent check-ins', () => {
      const recentDate = new Date('2026-01-14').toISOString(); // 1 day ago
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ lastCheckinDate: recentDate }),
          createMockKr({ lastCheckinDate: recentDate }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const checkinFactor = result.factors.find(f => f.id === 'checkin_frequency');
      expect(checkinFactor?.score).toBe(100);
      expect(checkinFactor?.status).toBe('good');
    });

    it('should score 0 when no KRs have check-ins', () => {
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ lastCheckinDate: null }),
          createMockKr({ lastCheckinDate: null }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const checkinFactor = result.factors.find(f => f.id === 'checkin_frequency');
      expect(checkinFactor?.score).toBe(0);
      expect(checkinFactor?.status).toBe('bad');
    });

    it('should score based on proportion of recent check-ins', () => {
      const recentDate = new Date('2026-01-14').toISOString();
      const oldDate = new Date('2026-01-01').toISOString(); // 14 days ago
      
      const result = calculateObjectiveHealth({
        krs: [
          createMockKr({ lastCheckinDate: recentDate }),
          createMockKr({ lastCheckinDate: oldDate }),
        ],
        initiatives: [],
        cycle: null,
      });
      
      const checkinFactor = result.factors.find(f => f.id === 'checkin_frequency');
      expect(checkinFactor?.score).toBe(50); // 1/2 recent
    });
  });

  describe('KPI trend factor', () => {
    it('should score 100 for positive trend', () => {
      const result = calculateObjectiveHealth({
        krs: [createMockKr()],
        initiatives: [],
        cycle: null,
        primaryKpiTrend: 'up',
      });
      
      const trendFactor = result.factors.find(f => f.id === 'kpi_trend');
      expect(trendFactor?.score).toBe(100);
      expect(trendFactor?.status).toBe('good');
    });

    it('should score 0 for negative trend', () => {
      const result = calculateObjectiveHealth({
        krs: [createMockKr()],
        initiatives: [],
        cycle: null,
        primaryKpiTrend: 'down',
      });
      
      const trendFactor = result.factors.find(f => f.id === 'kpi_trend');
      expect(trendFactor?.score).toBe(0);
      expect(trendFactor?.status).toBe('bad');
    });

    it('should score 50 for stable trend', () => {
      const result = calculateObjectiveHealth({
        krs: [createMockKr()],
        initiatives: [],
        cycle: null,
        primaryKpiTrend: 'stable',
      });
      
      const trendFactor = result.factors.find(f => f.id === 'kpi_trend');
      expect(trendFactor?.score).toBe(50);
      expect(trendFactor?.status).toBe('warning');
    });

    it('should not include trend factor when no trend provided', () => {
      const result = calculateObjectiveHealth({
        krs: [createMockKr()],
        initiatives: [],
        cycle: null,
      });
      
      const trendFactor = result.factors.find(f => f.id === 'kpi_trend');
      expect(trendFactor).toBeUndefined();
    });
  });

  describe('late initiatives factor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should score 100 when no initiatives are late', () => {
      const futureDate = new Date('2026-02-15').toISOString();
      const result = calculateObjectiveHealth({
        krs: [],
        initiatives: [
          createMockInitiative({ expected_end_date: futureDate, status: 'in_progress' }),
        ],
        cycle: null,
      });
      
      const lateFactor = result.factors.find(f => f.id === 'late_initiatives');
      expect(lateFactor?.score).toBe(100);
      expect(lateFactor?.status).toBe('good');
    });

    it('should reduce score for late initiatives', () => {
      const pastDate = new Date('2026-01-01').toISOString();
      const result = calculateObjectiveHealth({
        krs: [],
        initiatives: [
          createMockInitiative({ expected_end_date: pastDate, status: 'in_progress' }),
          createMockInitiative({ expected_end_date: pastDate, status: 'in_progress' }),
        ],
        cycle: null,
      });
      
      const lateFactor = result.factors.find(f => f.id === 'late_initiatives');
      expect(lateFactor?.score).toBe(0); // 0/2 on time
      expect(lateFactor?.status).toBe('bad');
    });

    it('should not count completed initiatives as late', () => {
      const pastDate = new Date('2026-01-01').toISOString();
      const result = calculateObjectiveHealth({
        krs: [],
        initiatives: [
          createMockInitiative({ expected_end_date: pastDate, status: 'completed' }),
        ],
        cycle: null,
      });
      
      const lateFactor = result.factors.find(f => f.id === 'late_initiatives');
      expect(lateFactor?.score).toBe(100);
    });
  });

  describe('cycle alignment factor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should score well when KR progress is ahead of cycle progress', () => {
      const cycle = createMockCycle({
        start_date: '2026-01-01',
        end_date: '2026-03-31', // ~16% elapsed on Jan 15
      });
      
      const result = calculateObjectiveHealth({
        krs: [createMockKr({ current_value: 50, baseline: 0, target: 100 })], // 50% progress
        initiatives: [],
        cycle,
      });
      
      const alignmentFactor = result.factors.find(f => f.id === 'cycle_alignment');
      expect(alignmentFactor).toBeDefined();
      expect(alignmentFactor?.status).toBe('good');
      expect(alignmentFactor?.message).toContain('Adiantado');
    });

    it('should score poorly when KR progress is behind cycle progress', () => {
      const cycle = createMockCycle({
        start_date: '2026-01-01',
        end_date: '2026-01-31', // ~50% elapsed on Jan 15
      });
      
      const result = calculateObjectiveHealth({
        krs: [createMockKr({ current_value: 10, baseline: 0, target: 100 })], // 10% progress
        initiatives: [],
        cycle,
      });
      
      const alignmentFactor = result.factors.find(f => f.id === 'cycle_alignment');
      expect(alignmentFactor).toBeDefined();
      expect(alignmentFactor?.status).toBe('bad');
      expect(alignmentFactor?.message).toContain('atrasado');
    });
  });

  describe('overall health level determination', () => {
    it('should return "healthy" when weighted score >= 70', () => {
      const result = calculateObjectiveHealth({
        krs: [FIXTURES.healthyKr],
        initiatives: [],
        cycle: null,
      });
      
      expect(result.level).toBe('healthy');
      expect(result.summary).toContain('saudável');
    });

    it('should return "at_risk" when weighted score is between 40-69', () => {
      const result = calculateObjectiveHealth({
        krs: [FIXTURES.atRiskKr],
        initiatives: [],
        cycle: null,
      });
      
      expect(result.level).toBe('at_risk');
    });

    it('should return "critical" when weighted score < 40', () => {
      const result = calculateObjectiveHealth({
        krs: [FIXTURES.criticalKr],
        initiatives: [],
        cycle: null,
      });
      
      expect(result.level).toBe('critical');
      expect(result.summary).toContain('crítica');
    });
  });
});

describe('getHealthLevelConfig', () => {
  it('should return correct config for healthy level', () => {
    const config = getHealthLevelConfig('healthy');
    expect(config.label).toBe('Saudável');
    expect(config.emoji).toBe('🟢');
    expect(config.color).toContain('green');
  });

  it('should return correct config for at_risk level', () => {
    const config = getHealthLevelConfig('at_risk');
    expect(config.label).toBe('Em risco');
    expect(config.emoji).toBe('🟡');
    expect(config.color).toContain('yellow');
  });

  it('should return correct config for critical level', () => {
    const config = getHealthLevelConfig('critical');
    expect(config.label).toBe('Crítico');
    expect(config.emoji).toBe('🔴');
    expect(config.color).toContain('red');
  });

  it('should return bgColor and borderColor for all levels', () => {
    const levels: HealthLevel[] = ['healthy', 'at_risk', 'critical'];
    levels.forEach(level => {
      const config = getHealthLevelConfig(level);
      expect(config.bgColor).toBeDefined();
      expect(config.borderColor).toBeDefined();
    });
  });
});
