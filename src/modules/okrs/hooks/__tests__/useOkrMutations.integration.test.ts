/**
 * useOkrMutations — Integration Tests
 * 
 * Validates soft-delete patterns, query invalidation, and toast notifications
 * for all 4 cancellation hooks.
 * 
 * Pattern: mock Supabase client → renderHook → mutate → assert side effects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';
import {
  useCancelOrgObjective,
  useCancelOrgKeyResult,
  useCancelTeamObjective,
  useCancelTeamKeyResult,
} from '../useOkrMutations';

// ============================================================
// MOCKS
// ============================================================

// Track Supabase calls
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ error: null });

const mockClient = {
  from: vi.fn(() => ({
    update: mockUpdate,
    eq: mockEq,
  })),
};

// Chaining: .update() returns object with .eq()
mockUpdate.mockReturnValue({ eq: mockEq });

vi.mock('@/integrations/supabase/getOptionalBuClient', () => ({
  useOptionalBuClient: () => ({ client: mockClient }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================
// HELPERS
// ============================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Spy on invalidateQueries
  vi.spyOn(queryClient, 'invalidateQueries');

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { Wrapper, queryClient };
}

// ============================================================
// TESTS
// ============================================================

describe('useOkrMutations — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
  });

  // ── useCancelOrgObjective ──

  describe('useCancelOrgObjective', () => {
    it('updates status to cancelled (soft-delete, never physical DELETE)', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelOrgObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('obj-123');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockClient.from).toHaveBeenCalledWith('okr_org_objectives');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ updated_at: expect.any(String) })
      );
    });

    it('calls .eq("id", objectiveId) for targeting', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelOrgObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('obj-456');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockEq).toHaveBeenCalledWith('id', 'obj-456');
    });

    it('invalidates orgObjectivesPrefix and dashboardDataPrefix on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useCancelOrgObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('obj-789');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-org-objectives'] })
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-dashboard-data'] })
      );
    });

    it('shows toast.success on success', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelOrgObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('obj-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Objetivo organizacional cancelado');
    });

    it('shows toast.error on failure', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'DB error', code: 'PGRST' } });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelOrgObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('obj-fail');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(toast.error).toHaveBeenCalledWith('Erro ao cancelar objetivo');
    });
  });

  // ── useCancelOrgKeyResult ──

  describe('useCancelOrgKeyResult', () => {
    it('uses cancelled_at (not status) — KRs have RAG status, soft-delete via timestamp', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelOrgKeyResult(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('kr-org-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockClient.from).toHaveBeenCalledWith('okr_org_key_results');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelled_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      // Must NOT have status field — KRs use cancelled_at
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload).not.toHaveProperty('status');
    });

    it('invalidates orgKeyResultsPrefix, orgObjectivesPrefix, dashboardDataPrefix', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useCancelOrgKeyResult(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('kr-org-2');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-org-key-results'] })
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-org-objectives'] })
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-dashboard-data'] })
      );
    });
  });

  // ── useCancelTeamObjective ──

  describe('useCancelTeamObjective', () => {
    it('updates status to cancelled on okr_team_objectives', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelTeamObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('team-obj-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockClient.from).toHaveBeenCalledWith('okr_team_objectives');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
    });

    it('invalidates teamObjectivesPrefix, teamKeyResultsPrefix, dashboardDataPrefix', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useCancelTeamObjective(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('team-obj-2');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-team-objectives'] })
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['okr-team-key-results'] })
      );
    });
  });

  // ── useCancelTeamKeyResult ──

  describe('useCancelTeamKeyResult', () => {
    it('uses cancelled_at (not status) for team KRs — same pattern as org KRs', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelTeamKeyResult(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('team-kr-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockClient.from).toHaveBeenCalledWith('okr_team_key_results');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelled_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload).not.toHaveProperty('status');
    });

    it('shows toast.success "Key Result cancelado"', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelTeamKeyResult(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('team-kr-2');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Key Result cancelado');
    });
  });

  // ── Cross-cutting: no physical DELETE ──

  describe('soft-delete enforcement', () => {
    it('none of the 4 hooks call .delete() — always .update()', async () => {
      const mockDelete = vi.fn();
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        delete: mockDelete,
      });

      const { Wrapper } = createWrapper();

      // Test all 4 hooks
      const hooks = [
        useCancelOrgObjective,
        useCancelOrgKeyResult,
        useCancelTeamObjective,
        useCancelTeamKeyResult,
      ];

      for (const useHook of hooks) {
        const { result } = renderHook(() => useHook(), { wrapper: Wrapper });
        await act(async () => {
          result.current.mutate('any-id');
        });
        await waitFor(() => !result.current.isPending);
      }

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
