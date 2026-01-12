import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// Must match the default storageKey used by the global client to share sessions.
const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

const buClientCache = new Map<string, SupabaseClient<Database>>();

export function clearBuClientCache() {
  buClientCache.clear();
}

/**
 * Returns a singleton BU-scoped client for the given BU.
 * This avoids creating multiple GoTrueClient instances (which can cause undefined auth behavior).
 */
export function getBuScopedClient(buId: string): SupabaseClient<Database> {
  const cached = buClientCache.get(buId);
  if (cached) return cached;

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { "x-current-bu-id": buId },
    },
    auth: {
      storage: localStorage, // CRITICAL: Share storage with global client
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // Hydrate auth state ASAP so PostgREST requests include the user's JWT (otherwise RLS will behave as anon).
  // Intentionally fire-and-forget: we only need the side-effect of loading session into the auth client.
  void client.auth.getSession();

  buClientCache.set(buId, client);
  return client;
}

export function getOptionalBuScopedClient(buId: string | null): SupabaseClient<Database> | null {
  if (!buId) return null;
  return getBuScopedClient(buId);
}
