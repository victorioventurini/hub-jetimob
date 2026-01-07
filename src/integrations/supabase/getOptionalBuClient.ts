/**
 * Optional BU-Scoped Client Helper
 * 
 * Provides a safe way to get a BU-scoped client in components/hooks
 * that may be mounted before BU selection. Unlike useBuScopedSupabase(),
 * this helper does NOT throw if buId is null.
 * 
 * USAGE:
 * - In components that render both pre-BU and post-BU.
 * - Use `enabled: isReady` in TanStack Query to gate queries.
 * 
 * RULES:
 * - If buId is null => client is null, isReady is false
 * - If buId exists => client is BU-scoped, isReady is true
 * 
 * @example
 * const { client, isReady } = useOptionalBuClient();
 * 
 * const { data } = useQuery({
 *   queryKey: ['my-data', buId],
 *   queryFn: async () => {
 *     if (!client) throw new Error('No BU client');
 *     return client.from('table').select('*');
 *   },
 *   enabled: isReady,
 * });
 */

import { useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useBu } from '@/contexts/BuContext';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface OptionalBuClientResult {
  /** BU-scoped Supabase client, or null if BU not selected */
  client: SupabaseClient<Database> | null;
  /** True if BU is selected and client is ready */
  isReady: boolean;
  /** Current BU ID, or null */
  buId: string | null;
}

/**
 * Hook that returns an optional BU-scoped client.
 * Does NOT throw if BU is not selected. Use for components
 * that may render before BU selection.
 */
export function useOptionalBuClient(): OptionalBuClientResult {
  const { currentBuId } = useBu();

  const client = useMemo(() => {
    if (!currentBuId) return null;
    
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { 'x-current-bu-id': currentBuId },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }, [currentBuId]);

  return {
    client,
    isReady: !!currentBuId,
    buId: currentBuId,
  };
}

/**
 * Function to create an optional BU client outside React.
 * Returns null if buId is null.
 */
export function createOptionalBuClient(buId: string | null): SupabaseClient<Database> | null {
  if (!buId) return null;
  
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
