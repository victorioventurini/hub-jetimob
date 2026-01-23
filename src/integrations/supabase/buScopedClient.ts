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
  try {
    const tryExtractToken = (raw: string | null): string | null => {
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (
        parsed?.access_token ??
        parsed?.session?.access_token ??
        parsed?.currentSession?.access_token ??
        parsed?.user?.session?.access_token ??
        null
      );
    };

    // 1) Canonical key
    if (DEFAULT_AUTH_STORAGE_KEY) {
      const raw = localStorage.getItem(DEFAULT_AUTH_STORAGE_KEY);
      const token = tryExtractToken(raw);
      if (token) return token;
    }

    // 2) Fallback scan
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("sb-")) continue;
      if (!key.includes("auth-token")) continue;

      const token = tryExtractToken(localStorage.getItem(key));
      if (token) return token;
    }

    return null;
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

// ============================================================================
// SINGLETON CLIENT PATTERN
// ============================================================================
// 
// The key insight: we only need ONE Supabase client with the SAME auth state.
// The x-current-bu-id header can be injected per-request without creating new clients.
// This eliminates "Multiple GoTrueClient instances" warnings entirely.
// ============================================================================

let singletonBuClient: SupabaseClient<Database> | null = null;
let currentBuIdForClient: string | null = null;

// Custom fetch that injects BU header dynamically per-request
function createBuAwareFetch(getBuId: () => string | null) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers((init?.headers as HeadersInit) ?? undefined);
    
    // Inject BU header for current request
    const buId = getBuId();
    if (buId && !headers.has("x-current-bu-id")) {
      headers.set("x-current-bu-id", buId);
    }

    // Inject JWT if needed (avoid anon requests during cold starts)
    const storedToken = readAccessTokenFromStorage();
    const currentAuth = headers.get("Authorization") || headers.get("authorization");
    const currentToken = currentAuth?.startsWith("Bearer ") ? currentAuth.slice(7) : null;
    const currentRole = currentToken ? getJwtRole(currentToken) : null;
    const shouldInjectUserJwt = !currentAuth || currentRole === "anon" || currentRole === null;

    if (storedToken && shouldInjectUserJwt) {
      headers.set("Authorization", `Bearer ${storedToken}`);
    }

    return fetch(input, { ...init, headers });
  };
}

/**
 * Returns a singleton Supabase client that injects x-current-bu-id header per-request.
 * This avoids creating multiple GoTrueClient instances while still supporting BU switching.
 */
export function getBuScopedClient(buId: string): SupabaseClient<Database> {
  // Update current BU ID for the fetch interceptor
  currentBuIdForClient = buId;

  // Return existing singleton if available
  if (singletonBuClient) {
    return singletonBuClient;
  }

  // Create singleton client with dynamic BU header injection
  singletonBuClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createBuAwareFetch(() => currentBuIdForClient),
    },
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      // CRITICAL: Disable URL detection to prevent competing with global client
      detectSessionInUrl: false,
    },
  });

  // Hydrate auth state immediately
  void singletonBuClient.auth.getSession();

  return singletonBuClient;
}

export function getOptionalBuScopedClient(buId: string | null): SupabaseClient<Database> | null {
  if (!buId) return null;
  return getBuScopedClient(buId);
}

export function clearBuClientCache() {
  // Just reset the singleton reference - a new one will be created on next call
  singletonBuClient = null;
  currentBuIdForClient = null;
}

/**
 * Hard clears any persisted auth session for this project.
 */
export function clearAuthSessionStorage(): void {
  if (!DEFAULT_AUTH_STORAGE_KEY) return;

  try {
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
