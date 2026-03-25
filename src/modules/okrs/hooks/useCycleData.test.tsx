/**
 * useCycleData Hook Tests
 * 
 * Tests for cycle-related hooks using MSW for API mocking.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@/test/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { server } from '@/test/mocks/server';
import { 
  useCycleProgress, 
  useDateCycleValidation, 
  useExpectedProgress,
  type Cycle 
} from './useCycleData';
import { createMockCycle } from '@/test/mocks/fixtures';

// ============================================================
// Test Setup
// ============================================================

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

// Wrapper for hooks that need QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================
// useCycleProgress Tests
// ============================================================

describe('useCycleProgress', () => {
  describe('with null cycle', () => {
    it('should return default values when cycle is null', () => {
      const { result } = renderHook(() => useCycleProgress(null));
      
      expect(result.current).toEqual({
        totalDays: 0,
        elapsedDays: 0,
        remainingDays: 0,
        percentElapsed: 0,
        isActive: false,
        hasStarted: false,
        hasEnded: false,
      });
    });

    it('should return default values when cycle is undefined', () => {
      const { result } = renderHook(() => useCycleProgress(undefined));
      
      expect(result.current).toEqual({
        totalDays: 0,
        elapsedDays: 0,
        remainingDays: 0,
        percentElapsed: 0,
        isActive: false,
        hasStarted: false,
        hasEnded: false,
      });
    });
  });

  describe('with active cycle', () => {
    it('should calculate correct values for a current quarter', () => {
      // Create a cycle that is currently active (started 30 days ago, ends in 60 days)
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 60);
      
      const cycle = createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      const { result } = renderHook(() => useCycleProgress(cycle));
      
      expect(result.current.totalDays).toBe(90);
      expect(result.current.elapsedDays).toBe(30);
      expect(result.current.remainingDays).toBe(60);
      expect(result.current.percentElapsed).toBe(33); // 30/90 ≈ 33%
      expect(result.current.isActive).toBe(true);
      expect(result.current.hasStarted).toBe(true);
      expect(result.current.hasEnded).toBe(false);
    });

    it('should cap percentElapsed at 100', () => {
      // Create a cycle that ended 10 days ago
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 100);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - 10);
      
      const cycle = createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      const { result } = renderHook(() => useCycleProgress(cycle));
      
      expect(result.current.percentElapsed).toBe(100);
      expect(result.current.hasEnded).toBe(true);
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('with future cycle', () => {
    it('should return correct values for a cycle that has not started', () => {
      // Create a cycle that starts in 30 days
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 120);
      
      const cycle = createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      const { result } = renderHook(() => useCycleProgress(cycle));
      
      expect(result.current.totalDays).toBe(90);
      expect(result.current.elapsedDays).toBe(0); // Clamped to 0
      expect(result.current.remainingDays).toBeGreaterThan(90);
      expect(result.current.percentElapsed).toBe(0);
      expect(result.current.isActive).toBe(false);
      expect(result.current.hasStarted).toBe(false);
      expect(result.current.hasEnded).toBe(false);
    });
  });

  describe('with past cycle', () => {
    it('should return correct values for a cycle that has ended', () => {
      // Create a cycle that ended 30 days ago
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 120);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - 30);
      
      const cycle = createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      const { result } = renderHook(() => useCycleProgress(cycle));
      
      expect(result.current.totalDays).toBe(90);
      expect(result.current.remainingDays).toBe(0); // Clamped to 0
      expect(result.current.percentElapsed).toBe(100);
      expect(result.current.isActive).toBe(false);
      expect(result.current.hasStarted).toBe(true);
      expect(result.current.hasEnded).toBe(true);
    });
  });
});

// ============================================================
// useDateCycleValidation Tests
// ============================================================

describe('useDateCycleValidation', () => {
  const baseCycle = createMockCycle({
    start_date: '2026-01-01',
    end_date: '2026-03-31',
  });

  describe('with null inputs', () => {
    it('should return safe defaults when date is null', () => {
      const { result } = renderHook(() => useDateCycleValidation(null, baseCycle));
      
      expect(result.current).toEqual({
        isWithinCycle: true,
        extendsBeyondCycle: false,
        daysAfterCycle: 0,
      });
    });

    it('should return safe defaults when cycle is null', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-02-15', null));
      
      expect(result.current).toEqual({
        isWithinCycle: true,
        extendsBeyondCycle: false,
        daysAfterCycle: 0,
      });
    });
  });

  describe('with date within cycle', () => {
    it('should validate a date in the middle of the cycle', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-02-15', baseCycle));
      
      expect(result.current.isWithinCycle).toBe(true);
      expect(result.current.extendsBeyondCycle).toBe(false);
      expect(result.current.daysAfterCycle).toBe(0);
    });

    it('should validate date on cycle start', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-01-01', baseCycle));
      
      expect(result.current.isWithinCycle).toBe(true);
      expect(result.current.extendsBeyondCycle).toBe(false);
    });

    it('should validate date on cycle end', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-03-31', baseCycle));
      
      expect(result.current.isWithinCycle).toBe(true);
      expect(result.current.extendsBeyondCycle).toBe(false);
    });
  });

  describe('with date after cycle', () => {
    it('should detect when date extends beyond cycle', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-04-15', baseCycle));
      
      expect(result.current.isWithinCycle).toBe(false);
      expect(result.current.extendsBeyondCycle).toBe(true);
      expect(result.current.daysAfterCycle).toBe(15);
    });

    it('should calculate correct days after cycle', () => {
      const { result } = renderHook(() => useDateCycleValidation('2026-05-01', baseCycle));
      
      expect(result.current.extendsBeyondCycle).toBe(true);
      expect(result.current.daysAfterCycle).toBe(31); // April has 30 days + 1 day of May
    });
  });

  describe('with date before cycle', () => {
    it('should detect when date is before cycle start', () => {
      const { result } = renderHook(() => useDateCycleValidation('2025-12-15', baseCycle));
      
      expect(result.current.isWithinCycle).toBe(false);
      expect(result.current.isBeforeCycleStart).toBe(true);
      expect(result.current.extendsBeyondCycle).toBe(false);
    });
  });
});

// ============================================================
// useExpectedProgress Tests
// ============================================================

describe('useExpectedProgress', () => {
  describe('with null cycle', () => {
    it('should return default values when cycle is null', () => {
      const { result } = renderHook(() => useExpectedProgress(50, null));
      
      expect(result.current).toEqual({
        expectedProgress: 0,
        progressDelta: 0,
        isAhead: false,
        isBehind: false,
        isOnTrack: true,
      });
    });
  });

  describe('with inactive cycle', () => {
    it('should return default values for future cycle', () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 120);
      
      const futureCycle = createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      const { result } = renderHook(() => useExpectedProgress(50, futureCycle));
      
      expect(result.current.isOnTrack).toBe(true);
      expect(result.current.expectedProgress).toBe(0);
    });
  });

  describe('with active cycle', () => {
    // Create an active cycle that is 50% elapsed
    const createActiveCycle = () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 45); // 45 days ago
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 45); // 45 days from now
      
      return createMockCycle({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
    };

    it('should detect when progress is on track (within tolerance)', () => {
      const cycle = createActiveCycle();
      const { result } = renderHook(() => useExpectedProgress(50, cycle));
      
      // Expected is ~50%, actual is 50%, delta ~0
      expect(result.current.isOnTrack).toBe(true);
      expect(result.current.isAhead).toBe(false);
      expect(result.current.isBehind).toBe(false);
    });

    it('should detect when progress is ahead (more than 10% above expected)', () => {
      const cycle = createActiveCycle();
      const { result } = renderHook(() => useExpectedProgress(75, cycle));
      
      // Expected is ~50%, actual is 75%, delta ~25%
      expect(result.current.isAhead).toBe(true);
      expect(result.current.isOnTrack).toBe(false);
      expect(result.current.isBehind).toBe(false);
      expect(result.current.progressDelta).toBeGreaterThan(10);
    });

    it('should detect when progress is behind (more than 10% below expected)', () => {
      const cycle = createActiveCycle();
      const { result } = renderHook(() => useExpectedProgress(20, cycle));
      
      // Expected is ~50%, actual is 20%, delta ~-30%
      expect(result.current.isBehind).toBe(true);
      expect(result.current.isOnTrack).toBe(false);
      expect(result.current.isAhead).toBe(false);
      expect(result.current.progressDelta).toBeLessThan(-10);
    });

    it('should calculate correct progress delta', () => {
      const cycle = createActiveCycle();
      const { result } = renderHook(() => useExpectedProgress(60, cycle));
      
      // Expected is ~50%, actual is 60%, delta ~10%
      expect(result.current.progressDelta).toBeCloseTo(10, 0);
    });
  });
});
