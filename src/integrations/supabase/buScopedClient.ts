import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// IMPORTANT: Do NOT override storageKey in the Supabase client options.
// But we *do* need to know the default key so we can read the JWT immediately and avoid
// a race where PostgREST requests are sent as anon before auth hydrates.
const DEFAULT_AUTH_STORAGE_KEY = (() => {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
})();

function readAccessTokenFromStorage(): string | null {
  if (!DEFAULT_AUTH_STORAGE_KEY) return null;
  try {
    const raw = localStorage.getItem(DEFAULT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (
      parsed?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.session?.access_token ??
      null
    );
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getJwtRole(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const role = payload?.["role"];
  return typeof role === "string" ? role : null;
}

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
      // Force JWT as early as possible to avoid anonymous requests under RLS.
      // This is a pragmatic fix for a known race during cold starts/tab restores.
      fetch: async (input, init) => {
        const headers = new Headers((init?.headers as HeadersInit) ?? undefined);

        // Always ensure BU header is present (defense-in-depth).
        if (!headers.has("x-current-bu-id")) headers.set("x-current-bu-id", buId);

        const storedToken = readAccessTokenFromStorage();
        const currentAuth = headers.get("Authorization") || headers.get("authorization");
        const currentToken = currentAuth?.startsWith("Bearer ") ? currentAuth.slice(7) : null;
        const currentRole = currentToken ? getJwtRole(currentToken) : null;

        // If PostgREST is about to run as anon (common during cold starts/tab restores),
        // replace it with the persisted user JWT.
        const shouldInjectUserJwt = !currentAuth || currentRole === "anon" || currentRole === null;

        if (storedToken && shouldInjectUserJwt) {
          headers.set("Authorization", `Bearer ${storedToken}`);
          if (import.meta.env.DEV) {
            console.debug("[BuScopedClient] Injected JWT from storage for buId:", buId);
          }
        }

        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      storage: localStorage, // share storage with global client
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
