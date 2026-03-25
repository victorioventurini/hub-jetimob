/**
 * useCreateCheckin — Integration Tests
 * 
 * Validates check-in creation, KR status update, mention processing,
 * query invalidation, and identity convention (profileId usage).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateCheckin,
  statusToConfidence,
  confidenceToStatus,
  type CheckinConfidence,
  type CheckinStatus,
} from '../useCreateCheckin';

// ============================================================
// MOCKS
// ============================================================

const TEST_PROFILE_ID = 'profile-abc-123';
const TEST_BU_ID = 'bu-test-456';
const TEST_USER_ID = 'auth-user-789';

let insertCallLog: Array<{ table: string; payload: any }> = [];
let updateCallLog: Array<{ table: string; payload: any; eqField: string; eqValue: string }> = [];
let rpcCallLog: Array<{ fn: string; params: any }> = [];

const mockSupabase = {
  from: vi.fn((table: string) => ({
    insert: vi.fn((payload: any) => {
      insertCallLog.push({ table, payload });
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'checkin-new-1' }, error: null }),
        })),
      };
    }),
    update: vi.fn((payload: any) => ({
      eq: vi.fn((field: string, value: string) => {
        updateCallLog.push({ table, payload, eqField: field, eqValue: value });
        return Promise.resolve({ error: null });
      }),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: 'Test User' }, error: null }),
      })),
    })),
  })),
  rpc: vi.fn((fn: string, params: any) => {
    rpcCallLog.push({ fn, params });
    return Promise.resolve({ error: null });
  }),
};

vi.mock('@/integrations/supabase/useBuScopedSupabase', () => ({
  useBuScopedSupabase: () => mockSupabase,
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: () => ({ currentBuId: TEST_BU_ID }),
}));

vi.mock('@/hooks/useIdentity', () => ({
  useIdentity: () => ({ profileId: TEST_PROFILE_ID }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: TEST_USER_ID } }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/shareableLinks', () => ({
  getShareableUrl: (type: string, id: string) => `/go/${type}/${id}`,
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

// ============================================================
// TESTS — Helper functions (pure, no hooks)
// ============================================================

describe('statusToConfidence', () => {
  it('maps green → high', () => expect(statusToConfidence('green')).toBe('high'));
  it('maps yellow → medium', () => expect(statusToConfidence('yellow')).toBe('medium'));
  it('maps red → low', () => expect(statusToConfidence('red')).toBe('low'));
});

describe('confidenceToStatus', () => {
  it('maps high → green', () => expect(confidenceToStatus('high')).toBe('green'));
  it('maps medium → yellow', () => expect(confidenceToStatus('medium')).toBe('yellow'));
  it('maps low → red', () => expect(confidenceToStatus('low')).toBe('red'));
});

// ============================================================
// TESTS — Hook integration
// ============================================================

describe('useCreateCheckin — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCallLog = [];
    updateCallLog = [];
    rpcCallLog = [];
  });

  it('inserts check-in with user_id = profileId (identity convention)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-1',
        currentValue: 75,
        previousValue: 50,
        confidence: 'high',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const checkinInsert = insertCallLog.find(c => c.table === 'okr_checkins');
    expect(checkinInsert).toBeDefined();
    expect(checkinInsert!.payload.user_id).toBe(TEST_PROFILE_ID);
    expect(checkinInsert!.payload.kr_id).toBe('kr-1');
    expect(checkinInsert!.payload.current_value).toBe(75);
    expect(checkinInsert!.payload.previous_value).toBe(50);
    expect(checkinInsert!.payload.confidence).toBe('high');
  });

  it('updates KR status mapping: high→green, medium→yellow, low→red', async () => {
    const testCases: Array<[CheckinConfidence, CheckinStatus]> = [
      ['high', 'green'],
      ['medium', 'yellow'],
      ['low', 'red'],
    ];

    for (const [confidence, expectedStatus] of testCases) {
      insertCallLog = [];
      updateCallLog = [];

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({
          krId: 'kr-status-test',
          currentValue: 60,
          previousValue: 40,
          confidence,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const krUpdate = updateCallLog.find(c => c.table === 'okr_team_key_results');
      expect(krUpdate).toBeDefined();
      expect(krUpdate!.payload.status).toBe(expectedStatus);
      expect(krUpdate!.payload.current_value).toBe(60);
    }
  });

  it('processes mentions and emits notification via RPC', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-mention',
        currentValue: 80,
        previousValue: 70,
        confidence: 'high',
        comments: 'CC @[Alice](user-alice-id) and @[Bob](user-bob-id)',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should call emit_notification_event for each unique mention
    const notifCalls = rpcCallLog.filter(c => c.fn === 'emit_notification_event');
    expect(notifCalls).toHaveLength(2);
    
    const recipientIds = notifCalls.map(c => c.params.p_recipient_user_ids[0]);
    expect(recipientIds).toContain('user-alice-id');
    expect(recipientIds).toContain('user-bob-id');
  });

  it('deduplicates repeated mentions', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-dedup',
        currentValue: 90,
        previousValue: 80,
        confidence: 'high',
        comments: '@[Alice](user-same) and @[Alice Again](user-same)',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const notifCalls = rpcCallLog.filter(c => c.fn === 'emit_notification_event');
    expect(notifCalls).toHaveLength(1);
  });

  it('invalidates correct queryKeys on success', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-inv',
        currentValue: 50,
        previousValue: 40,
        confidence: 'medium',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-team-key-results'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-team-objectives'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['okr-dashboard-data'] })
    );
  });

  it('shows toast on success (default behavior)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-toast',
        currentValue: 60,
        previousValue: 50,
        confidence: 'high',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '✓ Check-in registrado' })
    );
  });

  it('skips toast when skipToast option is true', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckin({ skipToast: true }), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        krId: 'kr-silent',
        currentValue: 60,
        previousValue: 50,
        confidence: 'high',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToast).not.toHaveBeenCalled();
  });
});
