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
 *     return client.from('table').select('id, name, status'); // Explicit fields
 *   },
 *   enabled: isReady,
 * });
 */

import { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useBu } from '@/contexts/BuContext';
import type { Database } from './types';
import { getOptionalBuScopedClient } from './buScopedClient';

export interface OptionalBuClientResult {
  /** BU-scoped client, or null if BU not selected */
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
    return getOptionalBuScopedClient(currentBuId);
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
  return getOptionalBuScopedClient(buId);
}

