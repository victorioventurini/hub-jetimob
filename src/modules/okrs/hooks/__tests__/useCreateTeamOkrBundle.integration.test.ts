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

// Per-table error overrides: set tableErrors['okr_dependencies'] = { message: 'err' } to simulate failure
let tableErrors: Record<string, any> = {};
let insertCallLog: Array<{ table: string; payload: any }> = [];
let idCounter = 0;

const mockClient = {
  from: vi.fn((table: string) => {
    const error = tableErrors[table] || null;
    const id = `${table}-id-${++idCounter}`;

    return {
      insert: vi.fn((payload: any) => {
        insertCallLog.push({ table, payload });
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(
              error ? { data: null, error } : { data: { id }, error: null }
            ),
          })),
          // For contributors (no .select().single())
          then: undefined,
        };
      }),
    };
  }),
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
    tableErrors = {};
    idCounter = 0;
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

  it('creates dependencies as non-blocking — error logged but does not throw', async () => {
    tableErrors['okr_dependencies'] = { message: 'dep error' };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      dependencies: [{ kr_index: 0, depends_on_team_id: 'other-team' }],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consoleError).toHaveBeenCalledWith('Error creating dependency:', expect.anything());
    consoleError.mockRestore();
  });

  it('creates KR metric links as non-blocking — error logged but does not throw', async () => {
    tableErrors['okr_kr_metrics'] = { message: 'link error' };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      krMetricLinks: [{ kr_index: 0, kpi_id: 'kpi-1', role: 'primary' }],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consoleError).toHaveBeenCalledWith('Error creating KR metric link:', expect.anything());
    consoleError.mockRestore();
  });

  it('initiative error IS blocking — throws and triggers onError', async () => {
    tableErrors['okr_initiatives'] = { message: 'init error' };

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
    tableErrors['okr_team_objectives'] = { message: 'obj error' };

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(createMinimalInput());
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

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

  it('skips dependencies without team or KR reference', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      dependencies: [
        { kr_index: 0 }, // no depends_on_team_id or depends_on_kr_id
      ],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const depCalls = insertCallLog.filter(c => c.table === 'okr_dependencies');
    expect(depCalls).toHaveLength(0);
  });

  it('creates multiple KRs sequentially — all get bu_id and team_id', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTeamOkrBundle(), { wrapper: Wrapper });

    const input = createMinimalInput({
      keyResults: [
        { title: 'KR 1', type: 'contribution', baseline: 0, target: 100, unit: '%', direction: 'up', owner_user_id: 'p1' },
        { title: 'KR 2', type: 'enabler', baseline: 5, target: 50, unit: 'pts', direction: 'up', owner_user_id: 'p2' },
        { title: 'KR 3', type: 'foundational', baseline: 0, target: 1, unit: 'bool', direction: 'up', owner_user_id: 'p3' },
      ],
    });

    await act(async () => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const krCalls = insertCallLog.filter(c => c.table === 'okr_team_key_results');
    expect(krCalls).toHaveLength(3);
    krCalls.forEach(call => {
      expect(call.payload.bu_id).toBe(TEST_BU_ID);
      expect(call.payload.team_id).toBe('team-1');
    });
  });
});
