/**
 * Supabase Client Guard Utilities
 * 
 * Provides type-safe guards for optional Supabase clients.
 * Use these in mutations and async functions that receive
 * a potentially null client from useOptionalBuScopedSupabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Asserts that the Supabase client is not null.
 * Throws an error with a descriptive message if null.
 * 
 * @example
 * const assertedClient = assertSupabaseClient(supabase, "createItem");
 * // assertedClient is now guaranteed to be non-null
 */
export function assertSupabaseClient(
  client: SupabaseClient<Database> | null,
  operation: string
): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      `[SupabaseGuard] Client not available for operation: ${operation}. ` +
      "Ensure BU context is loaded before performing this operation."
    );
  }
  return client;
}

/**
 * Type guard to check if the Supabase client is available.
 * Use in conditional logic before performing operations.
 * 
 * @example
 * if (isSupabaseReady(supabase)) {
 *   // supabase is guaranteed non-null here
 *   await supabase.from("table").select();
 * }
 */
export function isSupabaseReady(
  client: SupabaseClient<Database> | null
): client is SupabaseClient<Database> {
  return client !== null;
}
