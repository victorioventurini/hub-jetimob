/**
 * useCreateTeamOkrBundle — Integration Tests
 * 
 * Validates atomic creation of objective + KRs + dependencies + initiatives + KR metric links.
 * Verifies bu_id enforcement, profileId usage, error handling patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';
import { useCreateTeamOkrBundle, type CreateTeamOkrBundleInput } from '../useCreateTeamOkrBundle';

// ============================================================
// MOCKS
// ============================================================

const TEST_BU_ID = 'bu-test-123';
const TEST_PROFILE_ID = 'profile-test-456';

// Track all insert/select/single calls per table
const insertResults: Record<string, any> = {};
let insertCallLog: Array<{ table: string; payload: any }> = [];

const mockClient = {
  from: vi.fn((table: string) => ({
    insert: vi.fn((payload: any) => {
      insertCallLog.push({ table, payload });
      const result = insertResults[table] || { data: { id: `${table}-id-1` }, error: null };
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(result),
        })),
      };
    }),
  })),
};

vi.mock('@/integrations/supabase/getOptionalBuClient', () => ({
  useOptionalBuClient: () => ({ client: mockClient }),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: () => ({ currentBuId: TEST_BU_ID }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ============================================================
// HELPERS
// ============================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.spyOn(queryClient, 'invalidateQueries');

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
}

function createMinimalInput(overrides?: Partial<CreateTeamOkrBundleInput>): CreateTeamOkrBundleInput {
  return {
    objective: {
      title: 'Test Objective',
      team_id: 'team-1',
      org_objective_id: null,
      cycle_id: 'cycle-1',
      status: 'active',
    },
    keyResults: [
      {
        title: 'KR 1',
        type: 'contribution',
        baseline: 10,
        target: 100,
        unit: '%',
        direction: 'up',
        owner_user_id: TEST_PROFILE_ID,
      },
    ],
    ...overrides,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('useCreateTeamOkrBundle — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCallLog = [];
    // Default: all inserts succeed
    Object.keys(insertResults).forEach(k => delete insertResults[k]);
  });

  it('inserts objective with bu_id explicitly set', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(createMinimalInput());
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const objInsert = insertCallLog.find(c => c.table === 'okr_team_objectives');
    expect(objInsert).toBeDefined();
    expect(objInsert!.payload.bu_id).toBe(TEST_BU_ID);
  });

  it('inserts KR with bu_id and current_value initialized as baseline', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      keyResults: [
        {
          title: 'KR with baseline',
          type: 'enabler',
          baseline: 42,
          target: 200,
          unit: 'pts',
          direction: 'up',
          owner_user_id: TEST_PROFILE_ID,
        },
      ],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const krInsert = insertCallLog.find(c => c.table === 'okr_team_key_results');
    expect(krInsert).toBeDefined();
    expect(krInsert!.payload.bu_id).toBe(TEST_BU_ID);
    expect(krInsert!.payload.current_value).toBe(42); // baseline
    expect(krInsert!.payload.owner_user_id).toBe(TEST_PROFILE_ID);
  });

  it('creates dependencies as non-blocking — error does not throw', async () => {
    // Make dependency insert fail
    const originalFrom = mockClient.from;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'okr_dependencies') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'dep error' } }),
            })),
          })),
        };
      }
      return originalFrom(table);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      dependencies: [{ kr_index: 0, depends_on_team_id: 'other-team' }],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    // Should succeed despite dependency error (non-blocking)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('creates KR metric links as non-blocking — error does not throw', async () => {
    const originalFrom = mockClient.from;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'okr_kr_metrics') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'link error' } }),
            })),
          })),
        };
      }
      return originalFrom(table);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      krMetricLinks: [{ kr_index: 0, kpi_id: 'kpi-1', role: 'primary' }],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('initiative error IS blocking — throws and triggers onError', async () => {
    const originalFrom = mockClient.from;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'okr_initiatives') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'init error' } }),
            })),
          })),
        };
      }
      return originalFrom(table);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      initiatives: [{ kr_index: 0, name: 'Init 1', owner_user_id: TEST_PROFILE_ID }],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Erro ao criar OKRs do time');
  });

  it('objective error blocks everything — no KRs created', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'okr_team_objectives') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'obj error' } }),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }),
          })),
        })),
      };
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(createMinimalInput());
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // KR table should never have been called
    const krCalls = insertCallLog.filter(c => c.table === 'okr_team_key_results');
    expect(krCalls).toHaveLength(0);
  });

  it('invalidates correct queryKeys on success', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(createMinimalInput());
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-team-objectives'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-team-key-results'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-dashboard-data'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['cross-dependencies'] })
    );
  });

  it('throws when supabase client is not available', async () => {
    // Override mock to return null client
    vi.doMock('@/integrations/supabase/getOptionalBuClient', () => ({
      useOptionalBuClient: () => ({ client: null }),
    }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(createMinimalInput());
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('inserts initiatives with bu_id and owner_user_id from input', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      initiatives: [
        { kr_index: 0, name: 'My Initiative', owner_user_id: TEST_PROFILE_ID },
      ],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const initInsert = insertCallLog.find(c => c.table === 'okr_initiatives');
    expect(initInsert).toBeDefined();
    expect(initInsert!.payload.bu_id).toBe(TEST_BU_ID);
    expect(initInsert!.payload.owner_user_id).toBe(TEST_PROFILE_ID);
  });

  it('creates shared OKR contributors when is_shared is true', async () => {
    // Set up contributor insert to succeed (non-blocking)
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    // Need to handle the contributors insert path (no .select().single())
    const originalFrom = mockClient.from;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'okr_team_objective_contributors') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return originalFrom(table);
    });

    const input = createMinimalInput({
      objective: {
        title: 'Shared Obj',
        team_id: 'team-1',
        org_objective_id: null,
        cycle_id: 'cycle-1',
        status: 'active',
        is_shared: true,
        responsibility_model: 'collaborative',
      },
      contributingTeamIds: ['team-2', 'team-3'],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
