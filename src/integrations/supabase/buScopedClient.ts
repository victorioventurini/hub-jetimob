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

/**
 * Checks if a JWT token is expired, with a 30-second safety margin.
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  // Consider expired 30 seconds before actual expiry for safety margin
  return Date.now() >= (payload.exp - 30) * 1000;
}

// ============================================================================
// SINGLETON CLIENT PATTERN (HMR-safe)
// ============================================================================
// 
// The key insight: we only need ONE Supabase client with the SAME auth state.
// The x-current-bu-id header can be injected per-request without creating new clients.
// This eliminates "Multiple GoTrueClient instances" warnings entirely.
// 
// We store the singleton on globalThis to survive Vite HMR module re-evaluations.
// ============================================================================

type GlobalThisWithBuSingleton = typeof globalThis & {
  __hubJet_buScopedClient?: SupabaseClient<Database> | null;
  __hubJet_currentBuId?: string | null;
};

function getBuSingleton(): SupabaseClient<Database> | null {
  return (globalThis as GlobalThisWithBuSingleton).__hubJet_buScopedClient ?? null;
}

function setBuSingleton(client: SupabaseClient<Database> | null): void {
  (globalThis as GlobalThisWithBuSingleton).__hubJet_buScopedClient = client;
}

function getCurrentBuId(): string | null {
  return (globalThis as GlobalThisWithBuSingleton).__hubJet_currentBuId ?? null;
}

function setCurrentBuId(buId: string | null): void {
  (globalThis as GlobalThisWithBuSingleton).__hubJet_currentBuId = buId;
}

// Custom fetch that injects BU header dynamically per-request
// CRITICAL: Always prioritize localStorage token as source of truth to avoid
// race conditions with GoTrueClient's internal state (fixes RLS violations)
function createBuAwareFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : "[RequestInfo]";
    
    // DEBUG: Log every fetch call to diagnose hanging tickets insert
    const isTicketsRequest = url.includes("/tickets");
    if (isTicketsRequest) {
      console.error("[BuScopedClient] 🎫 TICKETS REQUEST INTERCEPTED:", url.substring(0, 150));
      console.error("[BuScopedClient] 🎫 Method:", init?.method ?? "GET");
      console.error("[BuScopedClient] 🎫 Body present:", !!init?.body);
    }
    
    const headers = new Headers((init?.headers as HeadersInit) ?? undefined);
    
    // Inject BU header for current request.
    // Source of truth priority:
    // 1) globalThis.__hubJet_currentBuId (kept in sync by useBuScopedSupabase)
    // 2) localStorage persisted BU from BuContext (hub_current_bu_id)
    //
    // Why fallback is needed:
    // In rare flows (HMR reload, hard refresh mid-bootstrap, cache clears), the globalThis BU
    // can desync momentarily even though the user already has a persisted BU selection.
    // If we send x-current-bu-id as null, RLS evaluates against the wrong BU context.
    const BU_CONTEXT_STORAGE_KEY = "hub_current_bu_id";
    const buIdFromGlobal = getCurrentBuId();
    const buIdFromStorage = (() => {
      try {
        return localStorage.getItem(BU_CONTEXT_STORAGE_KEY);
      } catch {
        return null;
      }
    })();

    const effectiveBuId = buIdFromGlobal || buIdFromStorage;
    const buIdSource = buIdFromGlobal ? "globalThis" : buIdFromStorage ? "localStorage" : "none";

    // Always enforce the effective BU header (even if caller set a different value)
    if (effectiveBuId && headers.get("x-current-bu-id") !== effectiveBuId) {
      headers.set("x-current-bu-id", effectiveBuId);
    }

    // =========================================================================
    // AUTH HEADER STRATEGY (ES256 signing-keys aware)
    // =========================================================================
    // The SDK may have special handling for ES256 tokens that we shouldn't bypass.
    // New strategy:
    // 1) If SDK already set a valid Authorization header, TRUST IT
    // 2) Only override if SDK didn't set one OR set an anon-looking token
    // =========================================================================
    
    const storedToken = readAccessTokenFromStorage();
    const sdkAuthHeader = headers.get("Authorization");
    
    // Check what the SDK provided
    let sdkHasValidAuth = false;
    if (sdkAuthHeader && sdkAuthHeader.startsWith("Bearer ey")) {
      const sdkToken = sdkAuthHeader.replace("Bearer ", "");
      const sdkPayload = decodeJwtPayload(sdkToken);
      const sdkRole = sdkPayload?.role;
      const sdkSub = sdkPayload?.sub;
      const sdkExpired = sdkPayload?.exp ? Date.now() >= (Number(sdkPayload.exp) - 30) * 1000 : true;
      
      // SDK is valid if: has sub, not expired, role is authenticated (not anon)
      sdkHasValidAuth = !!sdkSub && !sdkExpired && sdkRole === "authenticated";
      
      if (isTicketsRequest) {
        console.error("[BuScopedClient] 🎫 SDK AUTH ANALYSIS:", JSON.stringify({
          sdkHasAuth: true,
          sdkSub: sdkSub ? String(sdkSub).substring(0, 8) + "..." : null,
          sdkRole,
          sdkExpired,
          sdkHasValidAuth,
          sdkTokenPrefix: sdkToken.substring(0, 30),
        }));
      }
    }
    
    // Parse stored token claims
    let usedStoredToken = false;
    let hasSub = false;
    let storedRole: string | null = null;
    let expired = true;
    let shouldUseStored = false;

    if (storedToken) {
      const payload = decodeJwtPayload(storedToken);
      hasSub = typeof payload?.sub === "string" && payload.sub.length > 0;
      storedRole = getJwtRole(storedToken);
      expired = isTokenExpired(storedToken);
      shouldUseStored = hasSub && !expired && storedRole !== "anon";
    }

    // DECISION: Only override if SDK doesn't have valid auth AND we have a valid stored token
    if (!sdkHasValidAuth && shouldUseStored && storedToken) {
      headers.set("Authorization", `Bearer ${storedToken}`);
      usedStoredToken = true;
      
      if (isTicketsRequest) {
        console.error("[BuScopedClient] 🎫 OVERRIDING AUTH - SDK invalid, using localStorage token");
      }
    } else if (sdkHasValidAuth) {
      // Trust the SDK
      if (isTicketsRequest) {
        console.error("[BuScopedClient] 🎫 TRUSTING SDK AUTH - not overriding");
      }
    }

    // =========================================================================
    // PHASE 1: Detailed Auth Logging for Tickets
    // =========================================================================
    if (isTicketsRequest) {
      // Log original SDK headers BEFORE our modifications
      const originalHeaders = new Headers((init?.headers as HeadersInit) ?? undefined);
      console.error("[BuScopedClient] 🎫 Original SDK headers:", JSON.stringify({
        hasApiKey: originalHeaders.has("apikey"),
        hasAuthorization: originalHeaders.has("Authorization"),
        contentType: originalHeaders.get("Content-Type"),
        prefer: originalHeaders.get("Prefer"),
      }));

      // Decode the token FIRST and log it immediately
      console.error("[BuScopedClient] 🎫 STORED TOKEN CHECK:", JSON.stringify({
        hasStoredToken: !!storedToken,
        tokenLength: storedToken?.length ?? 0,
        tokenPrefix: storedToken?.substring(0, 50) ?? "NULL",
      }));
      
      const payload = storedToken ? decodeJwtPayload(storedToken) : null;
      
      // Log the JWT payload IMMEDIATELY after decoding
      console.error("[BuScopedClient] 🎫 JWT PAYLOAD:", payload ? JSON.stringify({
        sub: payload.sub,
        aud: payload.aud,
        role: payload.role,
        iss: payload.iss,
        exp: payload.exp,
        iat: payload.iat,
        expDate: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : "N/A",
        isExpired: payload.exp ? Date.now() >= (payload.exp as number) * 1000 : true,
      }) : `DECODE FAILED - storedToken=${storedToken ? 'exists' : 'null'}`);
      
      const authHeaderValue = headers.get("Authorization");
      const tokenPreview = authHeaderValue ? 
        `${authHeaderValue.substring(0, 40)}...${authHeaderValue.slice(-20)}` : 
        "MISSING";
      
      console.error("[BuScopedClient] 🎫 TICKETS AUTH DEBUG:", JSON.stringify({
        hasStoredToken: !!storedToken,
        hasSub,
        storedRole,
        expired,
        shouldUseStored,
        usedStoredToken,
        finalAuthHeader: headers.has("Authorization"),
        authHeaderPreview: tokenPreview,
        finalApiKeyHeader: headers.has("apikey"),
        apiKeyPreview: headers.get("apikey")?.substring(0, 20) ?? "MISSING",
        finalBuHeader: headers.has("x-current-bu-id"),
        buId: effectiveBuId,
        buIdSource,
        method: init?.method ?? "GET",
        timestamp: new Date().toISOString(),
      }));
      
      // Log the full headers being sent (for debugging)
      const headersObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headersObj[key] = key.toLowerCase() === "authorization" 
          ? `${value.substring(0, 40)}...` 
          : value.substring(0, 50);
      });
      console.error("[BuScopedClient] 🎫 FULL HEADERS BEING SENT:", JSON.stringify(headersObj));
    } else if (storedToken) {
      // Standard auth log for non-ticket requests
      console.error("[BuScopedClient] 🔐 Auth header decision:", JSON.stringify({
        url: url.substring(0, 100),
        buId: effectiveBuId,
        buIdSource,
        hasStoredToken: true,
        hasSub,
        storedRole,
        expired,
        usedStoredToken,
      }));
    }

    // Log warning if no token found
    if (!storedToken) {
      console.error("[BuScopedClient] ⚠️ NO TOKEN IN LOCALSTORAGE - RLS will likely fail:", JSON.stringify({
        url: url.substring(0, 100),
        buId: effectiveBuId,
        buIdSource,
        hasStoredToken: false,
        isTicketsRequest,
      }));
    }

    if (isTicketsRequest) {
      console.error("[BuScopedClient] 🎫 About to call native fetch for tickets...");
    }

    // =========================================================================
    // PHASE 3: Timeout Safety + Error Handling
    // =========================================================================
    const FETCH_TIMEOUT_MS = 30000; // 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("[BuScopedClient] 💀 FETCH TIMEOUT after 30s:", url.substring(0, 100));
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input, { 
        ...init, 
        headers, 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);

      if (isTicketsRequest) {
        console.error("[BuScopedClient] 🎫 Response received:", JSON.stringify({
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        }));
      }

      return response;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      const isAbort = (fetchError as Error)?.name === "AbortError";
      console.error("[BuScopedClient] 💥 FETCH ERROR:", JSON.stringify({
        name: (fetchError as Error)?.name,
        message: (fetchError as Error)?.message,
        isAbort,
        isTicketsRequest,
        url: url.substring(0, 100),
      }));

      throw fetchError;
    }
  };
}

/**
 * Returns a singleton Supabase client that injects x-current-bu-id header per-request.
 * This avoids creating multiple GoTrueClient instances while still supporting BU switching.
 * 
 * HMR-safe: The singleton is stored on globalThis to survive Vite module re-evaluations.
 */
export function getBuScopedClient(buId: string): SupabaseClient<Database> {
  // Update current BU ID for the fetch interceptor
  setCurrentBuId(buId);

  // Return existing singleton if available
  const existing = getBuSingleton();
  if (existing) {
    return existing;
  }

  // Create singleton client with dynamic BU header injection
  const created = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createBuAwareFetch(),
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
  void created.auth.getSession();

  setBuSingleton(created);
  return created;
}

export function getOptionalBuScopedClient(buId: string | null): SupabaseClient<Database> | null {
  if (!buId) return null;
  return getBuScopedClient(buId);
}

export function clearBuClientCache() {
  // Just reset the singleton reference - a new one will be created on next call
  setBuSingleton(null);
  setCurrentBuId(null);
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
