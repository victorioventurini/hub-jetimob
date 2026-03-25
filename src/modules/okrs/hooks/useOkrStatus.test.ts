/**
 * useOkrStatus Hook Tests
 * 
 * Tests for OKR status calculation functions and the status distribution hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateAutoStatus,
  mapRagToCalculated,
  STATUS_CONFIG,
  type OkrCalculatedStatus,
} from './useOkrStatus';
import { calculateProgress, type OkrRagStatus, type OkrDirection } from '../types';

// ============================================================
// calculateProgress Tests (from types.ts)
// ============================================================

describe('calculateProgress', () => {
  describe('direction: up', () => {
    it('should return 0 when current equals baseline', () => {
      expect(calculateProgress(0, 0, 100, 'up')).toBe(0);
    });

    it('should return 100 when current equals target', () => {
      expect(calculateProgress(0, 100, 100, 'up')).toBe(100);
    });

    it('should return 50 when halfway to target', () => {
      expect(calculateProgress(0, 50, 100, 'up')).toBe(50);
    });

    it('should handle non-zero baseline', () => {
      expect(calculateProgress(50, 75, 100, 'up')).toBe(50);
    });

    it('should clamp to 0 when below baseline', () => {
      expect(calculateProgress(50, 30, 100, 'up')).toBe(0);
    });

    it('should allow values above 100 when exceeding target (no-clamp)', () => {
      expect(calculateProgress(0, 150, 100, 'up')).toBe(150);
    });

    it('should handle edge case when target equals baseline', () => {
      expect(calculateProgress(100, 100, 100, 'up')).toBe(100);
      expect(calculateProgress(100, 50, 100, 'up')).toBe(0);
    });

    it('should calculate correctly with decimal values', () => {
      const progress = calculateProgress(0, 33.33, 100, 'up');
      expect(progress).toBeCloseTo(33.33, 1);
    });
  });

  describe('direction: down', () => {
    it('should return 0 when current equals baseline', () => {
      expect(calculateProgress(100, 100, 0, 'down')).toBe(0);
    });

    it('should return 100 when current equals target', () => {
      expect(calculateProgress(100, 0, 0, 'down')).toBe(100);
    });

    it('should return 50 when halfway to target', () => {
      expect(calculateProgress(100, 50, 0, 'down')).toBe(50);
    });

    it('should handle non-zero target', () => {
      expect(calculateProgress(100, 75, 50, 'down')).toBe(50);
    });

    it('should clamp to 0 when above baseline', () => {
      expect(calculateProgress(100, 150, 0, 'down')).toBe(0);
    });

    it('should allow values above 100 when surpassing target (no-clamp)', () => {
      expect(calculateProgress(100, -50, 0, 'down')).toBe(150);
    });

    it('should handle edge case when target equals baseline', () => {
      expect(calculateProgress(50, 50, 50, 'down')).toBe(100);
      expect(calculateProgress(50, 100, 50, 'down')).toBe(0);
    });
  });
});

// ============================================================
// calculateAutoStatus Tests
// ============================================================

describe('calculateAutoStatus', () => {
  // Use fixed dates for testing
  const periodStart = new Date('2025-01-01T00:00:00Z');
  const periodEnd = new Date('2025-03-31T23:59:59Z'); // Q1 2025

  beforeEach(() => {
    // Mock current date to mid-quarter (Feb 15, 2025 = ~50% elapsed)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('not_started status', () => {
    it('should return not_started when progress is 0 and current equals baseline', () => {
      const status = calculateAutoStatus(0, 0, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('not_started');
    });

    it('should return not_started for down direction with no movement', () => {
      const status = calculateAutoStatus(100, 100, 0, 'down', periodStart, periodEnd);
      expect(status).toBe('not_started');
    });
  });

  describe('completed status', () => {
    it('should return completed when progress is 100%', () => {
      const status = calculateAutoStatus(0, 100, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('completed');
    });

    it('should return completed when exceeding target', () => {
      const status = calculateAutoStatus(0, 150, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('completed');
    });

    it('should return completed for down direction reaching target', () => {
      const status = calculateAutoStatus(100, 0, 0, 'down', periodStart, periodEnd);
      expect(status).toBe('completed');
    });
  });

  describe('on_track status', () => {
    it('should return on_track when progress >= expected (mid-period)', () => {
      // At 50% elapsed, having 60% progress is on track
      const status = calculateAutoStatus(0, 60, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('on_track');
    });

    it('should return on_track when exactly at expected progress', () => {
      // At 50% elapsed, having 50% progress is on track
      const status = calculateAutoStatus(0, 50, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('on_track');
    });
  });

  describe('at_risk status', () => {
    it('should return at_risk when up to 15% below expected', () => {
      // At 50% elapsed, having 40% progress (10% gap) is at_risk
      const status = calculateAutoStatus(0, 40, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('at_risk');
    });

    it('should return at_risk at exactly 15% gap', () => {
      // At 50% elapsed, having 35% progress (15% gap) is still at_risk
      const status = calculateAutoStatus(0, 35, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('at_risk');
    });
  });

  describe('off_track status', () => {
    it('should return off_track when more than 15% below expected', () => {
      // At 50% elapsed, having 30% progress (20% gap) is off_track
      const status = calculateAutoStatus(0, 30, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('off_track');
    });

    it('should return off_track for significant underperformance', () => {
      // At 50% elapsed, having 10% progress is definitely off_track
      const status = calculateAutoStatus(0, 10, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('off_track');
    });
  });

  describe('time boundary conditions', () => {
    it('should handle before period start', () => {
      vi.setSystemTime(new Date('2024-12-15T12:00:00Z'));
      const status = calculateAutoStatus(0, 0, 100, 'up', periodStart, periodEnd);
      // Before start, expected progress is 0, so no movement is on_track (but actually not_started)
      expect(status).toBe('not_started');
    });

    it('should handle after period end', () => {
      vi.setSystemTime(new Date('2025-04-15T12:00:00Z'));
      // At 100% elapsed, having 70% progress is off_track (30% gap)
      const status = calculateAutoStatus(0, 70, 100, 'up', periodStart, periodEnd);
      expect(status).toBe('off_track');
    });
  });
});

// ============================================================
// mapRagToCalculated Tests
// ============================================================

describe('mapRagToCalculated', () => {
  it('should map green to on_track', () => {
    expect(mapRagToCalculated('green')).toBe('on_track');
  });

  it('should map yellow to at_risk', () => {
    expect(mapRagToCalculated('yellow')).toBe('at_risk');
  });

  it('should map red to off_track', () => {
    expect(mapRagToCalculated('red')).toBe('off_track');
  });

  it('should map not_started to not_started', () => {
    expect(mapRagToCalculated('not_started')).toBe('not_started');
  });

  it('should handle all RAG status values', () => {
    const ragStatuses: OkrRagStatus[] = ['green', 'yellow', 'red', 'not_started'];
    const expectedCalcStatuses: OkrCalculatedStatus[] = ['on_track', 'at_risk', 'off_track', 'not_started'];

    ragStatuses.forEach((rag, index) => {
      expect(mapRagToCalculated(rag)).toBe(expectedCalcStatuses[index]);
    });
  });
});

// ============================================================
// STATUS_CONFIG Tests
// ============================================================

describe('STATUS_CONFIG', () => {
  const allStatuses: OkrCalculatedStatus[] = [
    'on_track',
    'at_risk',
    'off_track',
    'not_started',
    'completed',
    'dropped',
  ];

  it('should have configuration for all calculated statuses', () => {
    allStatuses.forEach((status) => {
      expect(STATUS_CONFIG[status]).toBeDefined();
    });
  });

  it('should have label for each status', () => {
    allStatuses.forEach((status) => {
      expect(STATUS_CONFIG[status].label).toBeTruthy();
      expect(typeof STATUS_CONFIG[status].label).toBe('string');
    });
  });

  it('should have color properties for each status', () => {
    allStatuses.forEach((status) => {
      expect(STATUS_CONFIG[status].color).toBeDefined();
      expect(STATUS_CONFIG[status].bgColor).toBeDefined();
      expect(STATUS_CONFIG[status].borderColor).toBeDefined();
    });
  });

  it('should have distinct labels for different statuses', () => {
    const labels = allStatuses.map((s) => STATUS_CONFIG[s].label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

// ============================================================
// Type Validation Tests
// ============================================================

describe('OkrCalculatedStatus type validation', () => {
  it('should include all expected status values', () => {
    const validStatuses: OkrCalculatedStatus[] = [
      'on_track',
      'at_risk',
      'off_track',
      'not_started',
      'completed',
      'dropped',
    ];

    validStatuses.forEach((status) => {
      // This verifies the type at compile time
      const config = STATUS_CONFIG[status];
      expect(config).toBeDefined();
    });
  });
});

// ============================================================
// Integration Scenarios
// ============================================================

describe('Status calculation integration scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle sprint OKR lifecycle (2-week period)', () => {
    const sprintStart = new Date('2025-01-06T00:00:00Z');
    const sprintEnd = new Date('2025-01-19T23:59:59Z');

    // Day 1: Not started
    vi.setSystemTime(new Date('2025-01-06T10:00:00Z'));
    expect(calculateAutoStatus(0, 0, 10, 'up', sprintStart, sprintEnd)).toBe('not_started');

    // Day 7 (50% elapsed): Making progress
    vi.setSystemTime(new Date('2025-01-13T12:00:00Z'));
    expect(calculateAutoStatus(0, 5, 10, 'up', sprintStart, sprintEnd)).toBe('on_track');
    expect(calculateAutoStatus(0, 3, 10, 'up', sprintStart, sprintEnd)).toBe('at_risk');
    expect(calculateAutoStatus(0, 1, 10, 'up', sprintStart, sprintEnd)).toBe('off_track');

    // Day 14: Completed
    vi.setSystemTime(new Date('2025-01-19T18:00:00Z'));
    expect(calculateAutoStatus(0, 10, 10, 'up', sprintStart, sprintEnd)).toBe('completed');
  });

  it('should handle quarterly OKR with reduction target', () => {
    const q1Start = new Date('2025-01-01T00:00:00Z');
    const q1End = new Date('2025-03-31T23:59:59Z');

    // Mid-quarter: Reducing churn from 5% to 2%
    vi.setSystemTime(new Date('2025-02-15T12:00:00Z'));
    
    // Good progress reducing churn
    expect(calculateAutoStatus(5, 3.5, 2, 'down', q1Start, q1End)).toBe('on_track');
    
    // Churn went up - off track
    expect(calculateAutoStatus(5, 6, 2, 'down', q1Start, q1End)).toBe('off_track');
    
    // Completed - churn at or below target
    expect(calculateAutoStatus(5, 2, 2, 'down', q1Start, q1End)).toBe('completed');
  });
});
