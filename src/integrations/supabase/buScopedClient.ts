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
  // Primary path: canonical storage key derived from project ref.
  // Fallback path: scan localStorage for any sb-*-auth-token keys.
  // Why: some environments / SDK configs may vary the storage key; relying on a single key
  // can cause PostgREST requests to run as anon even when a session exists.
  try {
    const tryExtractToken = (raw: string | null, sourceKey: string): string | null => {
      if (!raw) return null;
      const parsed = JSON.parse(raw);

      // Supabase SDK v2.8x+ stores session in different structures depending on version.
      // Try all known paths in order of likelihood.
      const token =
        parsed?.access_token ?? // Direct token (v2.8x+ default)
        parsed?.session?.access_token ?? // session wrapper
        parsed?.currentSession?.access_token ?? // currentSession wrapper (legacy)
        parsed?.user?.session?.access_token ?? // nested user.session (rare)
        null;

      if (import.meta.env.DEV) {
        if (token) {
          console.debug("[BuScopedClient] Token found in storage key:", sourceKey, "| role:", getJwtRole(token));
        } else {
          console.debug(
            "[BuScopedClient] Auth storage found but no token extracted. key:",
            sourceKey,
            "| structure:",
            JSON.stringify(Object.keys(parsed || {}))
          );
        }
      }

      return token;
    };

    // 1) Canonical key
    if (DEFAULT_AUTH_STORAGE_KEY) {
      const raw = localStorage.getItem(DEFAULT_AUTH_STORAGE_KEY);
      const token = tryExtractToken(raw, DEFAULT_AUTH_STORAGE_KEY);
      if (token) return token;
      if (import.meta.env.DEV) {
        console.debug("[BuScopedClient] No auth token found in canonical storage key:", DEFAULT_AUTH_STORAGE_KEY);
      }
    }

    // 2) Fallback scan
    // Common patterns:
    // - sb-<projectRef>-auth-token
    // - sb-<projectRef>-auth-token.<suffix>
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("sb-")) continue;
      if (!key.includes("auth-token")) continue;

      const token = tryExtractToken(localStorage.getItem(key), key);
      if (token) return token;
    }

    return null;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[BuScopedClient] Error reading auth token from storage:", e);
    }
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
 * Hard clears any persisted auth session for this project.
 *
 * Why: in some edge cases (e.g. server-side session already revoked), the SDK call may fail
 * before it removes localStorage keys. This guarantees a true local logout.
 */
export function clearAuthSessionStorage(): void {
  if (!DEFAULT_AUTH_STORAGE_KEY) return;

  try {
    // Remove the canonical key and any related keys created by the auth client
    // (e.g. code verifier, provider token, etc.).
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DEFAULT_AUTH_STORAGE_KEY)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
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

        // Debug logging in dev mode
        if (import.meta.env.DEV) {
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          const hasAuth = headers.has("Authorization");
          const authRole = hasAuth ? getJwtRole(headers.get("Authorization")?.slice(7) || "") : null;
          console.debug(`[BuScopedClient] Request: ${url.split("?")[0]} | BU: ${buId} | Auth: ${hasAuth ? authRole || "jwt" : "none"}`);
        }

        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      // CRITICAL: Disable URL detection to prevent multiple GoTrueClient instances
      // from competing to handle the same auth callback. The global client handles this.
      detectSessionInUrl: false,
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
