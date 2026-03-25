/**
 * Tests for useKpisForWizard hook
 * 
 * Validates fail-safe behavior and data transformation.
 * Uses dynamic import instead of require() for ESM compatibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/integrations/supabase/useBuScopedSupabase', () => ({
  useOptionalBuScopedSupabase: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('@/contexts/BuContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/BuContext')>();
  return {
    ...actual,
    useBu: vi.fn(() => ({ currentBuId: 'test-bu' })),
  };
});

import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useQuery } from '@tanstack/react-query';
import { useKpisForWizard } from '../useKpisForWizard';

// ============================================================
// needsUpdate helper tests (extracted logic)
// ============================================================

describe('needsUpdate helper logic', () => {
  const needsUpdate = (frequency: string, lastDate: string | null | undefined): boolean => {
    if (!lastDate) return true;
    const last = new Date(lastDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    switch (frequency) {
      case 'daily': return diffDays >= 1;
      case 'weekly': return diffDays >= 7;
      case 'monthly': return diffDays >= 30;
      case 'quarterly': return diffDays >= 90;
      case 'manual': return false;
      default: return false;
    }
  };

  it('should return true when no lastDate is provided', () => {
    expect(needsUpdate('daily', null)).toBe(true);
    expect(needsUpdate('weekly', undefined)).toBe(true);
  });

  it('should correctly identify daily update needs', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(needsUpdate('daily', yesterday.toISOString())).toBe(true);
  });

  it('should correctly identify weekly update needs', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(needsUpdate('weekly', eightDaysAgo.toISOString())).toBe(true);
    expect(needsUpdate('weekly', twoDaysAgo.toISOString())).toBe(false);
  });

  it('should correctly identify monthly update needs', () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    expect(needsUpdate('monthly', thirtyOneDaysAgo.toISOString())).toBe(true);
    expect(needsUpdate('monthly', twentyDaysAgo.toISOString())).toBe(false);
  });

  it('should never require update for manual frequency', () => {
    const veryOldDate = new Date();
    veryOldDate.setDate(veryOldDate.getDate() - 365);
    expect(needsUpdate('manual', veryOldDate.toISOString())).toBe(false);
  });
});

// ============================================================
// Hook behavior tests
// ============================================================

describe('useKpisForWizard hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty state when supabase client is not available', () => {
    vi.mocked(useOptionalBuScopedSupabase).mockReturnValue(null);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    } as any);

    const result = useKpisForWizard({ ownerId: 'test-user' });

    expect(result.kpis).toEqual([]);
    expect(result.guardrails).toEqual([]);
    expect(result.hasError).toBe(false);
    expect(result.hasAlertsToShow).toBe(false);
    expect(result.hasKpisNeedingUpdate).toBe(false);
  });

  it('should return kpis with correct flags for hasAlertsToShow', () => {
    vi.mocked(useOptionalBuScopedSupabase).mockReturnValue({} as any);
    vi.mocked(useQuery).mockReturnValue({
      data: {
        kpis: [
          { id: '1', name: 'KPI 1', latest_rag_status: 'on_track', needs_update: false },
          { id: '2', name: 'KPI 2', latest_rag_status: 'at_risk', needs_update: true },
        ],
        guardrails: [],
      },
      error: null,
      isLoading: false,
    } as any);

    const result = useKpisForWizard({ ownerId: 'test-user' });

    expect(result.kpis).toHaveLength(2);
    expect(result.hasAlertsToShow).toBe(true);
    expect(result.hasKpisNeedingUpdate).toBe(true);
  });

  it('should return hasAlertsToShow false when all KPIs are on_track', () => {
    vi.mocked(useOptionalBuScopedSupabase).mockReturnValue({} as any);
    vi.mocked(useQuery).mockReturnValue({
      data: {
        kpis: [
          { id: '1', name: 'KPI 1', latest_rag_status: 'on_track', needs_update: false },
          { id: '2', name: 'KPI 2', latest_rag_status: 'on_track', needs_update: false },
        ],
        guardrails: [],
      },
      error: null,
      isLoading: false,
    } as any);

    const result = useKpisForWizard({ ownerId: 'test-user' });

    expect(result.hasAlertsToShow).toBe(false);
    expect(result.hasKpisNeedingUpdate).toBe(false);
  });

  it('should handle query error gracefully (fail-safe)', () => {
    vi.mocked(useOptionalBuScopedSupabase).mockReturnValue({} as any);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      error: new Error('Database error'),
      isLoading: false,
    } as any);

    const result = useKpisForWizard({ ownerId: 'test-user' });

    expect(result.kpis).toEqual([]);
    expect(result.hasError).toBe(true);
    expect(result.hasAlertsToShow).toBe(false);
    expect(result.hasKpisNeedingUpdate).toBe(false);
  });
});
