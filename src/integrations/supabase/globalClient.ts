/**
 * Global Supabase Client - Singleton Pattern
 * 
 * This file provides a properly configured global Supabase client that:
 * 1. Uses `detectSessionInUrl: false` to prevent "Multiple GoTrueClient instances" warnings
 * 2. Delegates session URL detection to a single point (AuthCallback page)
 * 3. Ensures compatibility with the BU-scoped singleton client
 * 
 * IMPORTANT: All auth operations (signIn, signOut, getSession) should use this client.
 * The auto-generated client.ts does NOT have detectSessionInUrl: false, causing conflicts.
 * 
 * @see docs/engineering/TECHNICAL_CONTEXT_REGISTRY.md
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Singleton instance
let globalClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns the singleton global Supabase client.
 * 
 * Key configuration:
 * - detectSessionInUrl: false - Prevents multiple clients from competing to detect session in URL
 * - The AuthCallback page explicitly handles URL session detection via supabase.auth.getSession()
 */
function createGlobalClient(): SupabaseClient<Database> {
  if (globalClientInstance) {
    return globalClientInstance;
  }

  globalClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      // CRITICAL: Disable URL detection to prevent competing with BU-scoped client
      // The AuthCallback page handles session extraction from URL explicitly
      detectSessionInUrl: false,
    },
  });

  return globalClientInstance;
}

/**
 * The singleton global Supabase client.
 * 
 * Use this for:
 * - Authentication operations (signIn, signOut, getSession)
 * - PRE-BU data access (profiles, bu_units, bu_user_memberships)
 * - Edge function invocations
 * 
 * DO NOT use for BU-scoped operational data - use useBuScopedSupabase() instead.
 */
export const supabase = createGlobalClient();
