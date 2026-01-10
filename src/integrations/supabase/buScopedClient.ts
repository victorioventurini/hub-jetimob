import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const buClientCache = new Map<string, SupabaseClient<Database>>();

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
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  buClientCache.set(buId, client);
  return client;
}

export function getOptionalBuScopedClient(buId: string | null): SupabaseClient<Database> | null {
  if (!buId) return null;
  return getBuScopedClient(buId);
}
