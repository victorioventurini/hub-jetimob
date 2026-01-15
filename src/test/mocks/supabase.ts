/**
 * Supabase Client Mock for Tests
 * 
 * Provides a mock implementation of the Supabase client
 * that can be configured per-test for different scenarios.
 */

import { vi } from 'vitest';

// Mock Supabase response builder
export function createMockSupabaseResponse<T>(data: T, error: null | { message: string; code?: string } = null) {
  return { data, error, count: Array.isArray(data) ? data.length : null };
}

export function createMockSupabaseError(message: string, code = 'PGRST116') {
  return { data: null, error: { message, code }, count: null };
}

// Mock query builder
export function createMockQueryBuilder<T>(mockData: T) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockData)),
    maybeSingle: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockData)),
    then: vi.fn((resolve) => resolve(createMockSupabaseResponse(mockData))),
  };

  return builder;
}

// Mock Supabase client
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue(createMockQueryBuilder(null)),
    rpc: vi.fn().mockResolvedValue(createMockSupabaseResponse(null)),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file.png' } }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  };
}

// Type for mock client
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
