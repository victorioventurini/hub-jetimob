/**
 * BU-Scoped Supabase Client Hook
 * 
 * Returns a Supabase client that automatically injects the
 * x-current-bu-id header in all requests for RLS enforcement.
 * 
 * USAGE RULES:
 * - useBuScopedSupabase(): REQUIRED for all operational data (throws if no BU)
 * - useOptionalBuScopedSupabase(): Returns null if no BU (safe for transitional states)
 * - Global supabase client: ONLY allowed for:
 *   - Auth operations
 *   - Membership bootstrap (useUserBus, useExternalUser)
 *   - Realtime subscriptions (NotificationCenter)
 *   - Pre-BU initialization hooks
 * 
 * Any other use of global client is considered a BUG.
 * 
 * Usage:
 *   const supabase = useBuScopedSupabase();
 *   // All queries will include x-current-bu-id header
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useBu } from '@/contexts/BuContext';
import type { Database } from './types';
import { getBuScopedClient, getOptionalBuScopedClient } from './buScopedClient';

/**
 * Creates a Supabase client with x-current-bu-id header injected.
 * The header is read by current_bu_id() function in PostgreSQL.
 * 
 * @throws Error if called before BuProvider is initialized (no currentBuId)
 */
export function useBuScopedSupabase(): SupabaseClient<Database> {
  const { currentBuId } = useBu();

  // Guard: Ensure this hook is only used after BU selection
  if (!currentBuId) {
    throw new Error(
      'useBuScopedSupabase called before BuProvider initialization or BU selection. ' +
        'For pre-BU hooks (useUserBus, useExternalUser), use the global supabase client instead.'
    );
  }

  // CRITICAL: Always call getBuScopedClient to ensure the current BU ID is set
  // The useMemo was causing issues where setCurrentBuId wasn't called on subsequent renders
  // because the client was already cached. Now we call it every render to ensure the
  // globalThis.__hubJet_currentBuId is always in sync with the current BU context.
  // 
  // This is safe because getBuScopedClient:
  // 1. Sets the current BU ID (needed for every request)
  // 2. Returns the cached client singleton (no new client created)
  const client = getBuScopedClient(currentBuId);

  return client;
}

/**
 * Safe version that returns null instead of throwing when BU is not available.
 * Use this for components that may render during transitional states (tab switching, etc.)
 */
export function useOptionalBuScopedSupabase(): SupabaseClient<Database> | null {
  const { currentBuId } = useBu();

  // Same fix as useBuScopedSupabase - always call to ensure BU ID is set
  const client = getOptionalBuScopedClient(currentBuId);

  return client;
}

/**
 * Get a BU-scoped client outside of React components.
 * Use this in utility functions when you have the buId available.
 */
export function createBuScopedClient(buId: string): SupabaseClient<Database> {
  return getBuScopedClient(buId);
}

