/**
 * BU-Scoped Supabase Client Hook
 * 
 * Returns a Supabase client that automatically injects the
 * x-current-bu-id header in all requests for RLS enforcement.
 * 
 * Usage:
 *   const supabase = useBuScopedSupabase();
 *   // All queries will include x-current-bu-id header
 */

import { useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useBu } from '@/contexts/BuContext';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase client with x-current-bu-id header injected.
 * The header is read by current_bu_id() function in PostgreSQL.
 */
export function useBuScopedSupabase(): SupabaseClient<Database> {
  const { currentBuId } = useBu();

  const client = useMemo(() => {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: currentBuId 
          ? { 'x-current-bu-id': currentBuId }
          : {},
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }, [currentBuId]);

  return client;
}

/**
 * Get a BU-scoped client outside of React components.
 * Use this in utility functions when you have the buId available.
 */
export function createBuScopedClient(buId: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { 'x-current-bu-id': buId },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
