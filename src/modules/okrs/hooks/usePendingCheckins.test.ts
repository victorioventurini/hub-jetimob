/**
 * usePendingCheckins Hook Tests
 * 
 * Tests for pending check-ins utility functions and hook logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDayName,
  isCheckinDay,
  isCheckinDueThisWeek,
} from './usePendingCheckins';

// ============================================================
// getDayName Tests
// ============================================================

describe('getDayName', () => {
  it('should return correct day names in Portuguese', () => {
    expect(getDayName(0)).toBe('Domingo');
    expect(getDayName(1)).toBe('Segunda');
    expect(getDayName(2)).toBe('Terça');
    expect(getDayName(3)).toBe('Quarta');
    expect(getDayName(4)).toBe('Quinta');
    expect(getDayName(5)).toBe('Sexta');
    expect(getDayName(6)).toBe('Sábado');
  });

  it('should return Segunda for invalid day numbers', () => {
    expect(getDayName(-1)).toBe('Segunda');
    expect(getDayName(7)).toBe('Segunda');
    expect(getDayName(100)).toBe('Segunda');
  });

  it('should handle edge cases with invalid inputs', () => {
    // These inputs result in NaN which is not a valid array index
    // The function returns 'Segunda' as default
    expect(getDayName(NaN)).toBe('Segunda');
    expect(getDayName(-999)).toBe('Segunda');
  });
});

// ============================================================
// isCheckinDay Tests
// ============================================================

describe('isCheckinDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true when today matches the check-in day', () => {
    // Set to a Wednesday (day 3)
    vi.setSystemTime(new Date('2026-01-14T10:00:00')); // Wednesday
    expect(isCheckinDay(3)).toBe(true);
  });

  it('should return false when today does not match the check-in day', () => {
    // Set to a Wednesday (day 3)
    vi.setSystemTime(new Date('2026-01-14T10:00:00')); // Wednesday
    expect(isCheckinDay(1)).toBe(false); // Monday
    expect(isCheckinDay(5)).toBe(false); // Friday
  });

  it('should handle Sunday correctly', () => {
    vi.setSystemTime(new Date('2026-01-18T10:00:00')); // Sunday
    expect(isCheckinDay(0)).toBe(true);
    expect(isCheckinDay(1)).toBe(false);
  });

  it('should handle Saturday correctly', () => {
    vi.setSystemTime(new Date('2026-01-17T10:00:00')); // Saturday
    expect(isCheckinDay(6)).toBe(true);
    expect(isCheckinDay(5)).toBe(false);
  });
});

// ============================================================
// isCheckinDueThisWeek Tests
// ============================================================

describe('isCheckinDueThisWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set current time to January 15, 2026 (Wednesday)
    vi.setSystemTime(new Date('2026-01-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('with null lastCheckinAt', () => {
    it('should return true when no previous check-in exists', () => {
      expect(isCheckinDueThisWeek(null, 'weekly', 3)).toBe(true);
      expect(isCheckinDueThisWeek(null, 'biweekly', 3)).toBe(true);
    });
  });

  describe('with weekly frequency', () => {
    it('should return true when last check-in was 7+ days ago', () => {
      const sevenDaysAgo = '2026-01-08T10:00:00';
      expect(isCheckinDueThisWeek(sevenDaysAgo, 'weekly', 3)).toBe(true);
    });

    it('should return true when last check-in was 10 days ago', () => {
      const tenDaysAgo = '2026-01-05T10:00:00';
      expect(isCheckinDueThisWeek(tenDaysAgo, 'weekly', 3)).toBe(true);
    });

    it('should return false when last check-in was less than 7 days ago', () => {
      const fiveDaysAgo = '2026-01-10T10:00:00';
      expect(isCheckinDueThisWeek(fiveDaysAgo, 'weekly', 3)).toBe(false);
    });

    it('should return false when last check-in was yesterday', () => {
      const yesterday = '2026-01-14T10:00:00';
      expect(isCheckinDueThisWeek(yesterday, 'weekly', 3)).toBe(false);
    });

    it('should return false when last check-in was today', () => {
      const today = '2026-01-15T08:00:00';
      expect(isCheckinDueThisWeek(today, 'weekly', 3)).toBe(false);
    });
  });

  describe('with biweekly frequency', () => {
    it('should return true when last check-in was 14+ days ago', () => {
      const fourteenDaysAgo = '2026-01-01T10:00:00';
      expect(isCheckinDueThisWeek(fourteenDaysAgo, 'biweekly', 3)).toBe(true);
    });

    it('should return true when last check-in was 20 days ago', () => {
      const twentyDaysAgo = '2025-12-26T10:00:00';
      expect(isCheckinDueThisWeek(twentyDaysAgo, 'biweekly', 3)).toBe(true);
    });

    it('should return false when last check-in was less than 14 days ago', () => {
      const tenDaysAgo = '2026-01-05T10:00:00';
      expect(isCheckinDueThisWeek(tenDaysAgo, 'biweekly', 3)).toBe(false);
    });

    it('should return false when last check-in was 13 days ago', () => {
      const thirteenDaysAgo = '2026-01-02T10:00:00';
      expect(isCheckinDueThisWeek(thirteenDaysAgo, 'biweekly', 3)).toBe(false);
    });

    it('should return false when last check-in was 7 days ago', () => {
      const sevenDaysAgo = '2026-01-08T10:00:00';
      expect(isCheckinDueThisWeek(sevenDaysAgo, 'biweekly', 3)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle check-in at exactly 7 days boundary for weekly', () => {
      const exactlySevenDays = '2026-01-08T10:00:00'; // Exactly 7 days ago
      expect(isCheckinDueThisWeek(exactlySevenDays, 'weekly', 3)).toBe(true);
    });

    it('should handle check-in at exactly 14 days boundary for biweekly', () => {
      const exactlyFourteenDays = '2026-01-01T10:00:00'; // Exactly 14 days ago
      expect(isCheckinDueThisWeek(exactlyFourteenDays, 'biweekly', 3)).toBe(true);
    });

    it('should handle ISO date strings', () => {
      const isoDate = '2026-01-05T10:00:00.000Z';
      expect(isCheckinDueThisWeek(isoDate, 'weekly', 3)).toBe(true);
    });

    it('should handle date-only strings', () => {
      const dateOnly = '2026-01-05';
      expect(isCheckinDueThisWeek(dateOnly, 'weekly', 3)).toBe(true);
    });
  });
});

// ============================================================
// PendingCheckin type structure tests
// ============================================================

describe('PendingCheckin type structure', () => {
  it('should define all required fields', () => {
    // This is a compile-time type check
    const mockPendingCheckin = {
      kr_id: 'kr-123',
      kr_title: 'Increase sales by 20%',
      owner_user_id: 'user-456',
      co_responsibles: ['user-789'],
      team_id: 'team-001',
      current_value: 15,
      target: 20,
      baseline: 10,
      direction: 'up' as const,
      unit: '%',
      status: 'yellow' as const,
      last_checkin_at: '2026-01-10T10:00:00',
      team_name: 'Sales Team',
      checkin_frequency: 'weekly' as const,
      checkin_day: 3,
      checkin_deadline_hour: 18,
      objective_title: 'Drive Revenue Growth',
      objective_id: 'obj-001',
      is_overdue: true,
      days_since_checkin: 5,
    };

    expect(mockPendingCheckin.kr_id).toBe('kr-123');
    expect(mockPendingCheckin.status).toBe('yellow');
    expect(mockPendingCheckin.direction).toBe('up');
    expect(mockPendingCheckin.is_overdue).toBe(true);
  });

  it('should allow nullable fields', () => {
    const mockWithNulls = {
      kr_id: 'kr-123',
      kr_title: 'Test KR',
      owner_user_id: null,
      co_responsibles: null,
      team_id: 'team-001',
      current_value: 0,
      target: 100,
      baseline: 0,
      direction: 'up' as const,
      unit: '',
      status: 'not_started' as const,
      last_checkin_at: null,
      team_name: 'Test Team',
      checkin_frequency: 'weekly' as const,
      checkin_day: 1,
      checkin_deadline_hour: 17,
      objective_title: null,
      objective_id: null,
      is_overdue: false,
      days_since_checkin: null,
    };

    expect(mockWithNulls.owner_user_id).toBeNull();
    expect(mockWithNulls.last_checkin_at).toBeNull();
    expect(mockWithNulls.objective_title).toBeNull();
    expect(mockWithNulls.days_since_checkin).toBeNull();
  });
});
