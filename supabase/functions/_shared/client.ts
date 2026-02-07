/**
 * Centralized Supabase Client Factory
 * 
 * Provides a single source of truth for Supabase client creation in Edge Functions.
 * Use these helpers instead of manually creating clients in each function.
 * 
 * @module _shared/client
 * @version 1.0.0
 * 
 * ## Usage
 * ```ts
 * import { createServiceClient, createAuthenticatedClient } from "../_shared/client.ts";
 * 
 * const serviceClient = createServiceClient();
 * const userClient = createAuthenticatedClient(authHeader);
 * ```
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

export interface ClientOptions {
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Whether to persist session (default: false for Edge Functions) */
  persistSession?: boolean;
}

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

/**
 * Get required environment variable or throw
 */
function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get Supabase URL from environment
 */
export function getSupabaseUrl(): string {
  return getEnvOrThrow("SUPABASE_URL");
}

/**
 * Get Supabase anon key from environment
 */
export function getSupabaseAnonKey(): string {
  return getEnvOrThrow("SUPABASE_ANON_KEY");
}

/**
 * Get Supabase service role key from environment
 */
export function getSupabaseServiceKey(): string {
  return getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
}

// =============================================================================
// CLIENT FACTORIES
// =============================================================================

/**
 * Create a service-role Supabase client.
 * 
 * This client bypasses RLS and should only be used for:
 * - Background jobs and cron tasks
 * - Admin operations
 * - System-level data access
 * 
 * ⚠️ NEVER expose this client to user-facing operations directly.
 */
export function createServiceClient(options?: ClientOptions): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: options?.persistSession ?? false,
      autoRefreshToken: false,
    },
    global: {
      headers: options?.headers,
    },
  });
}

/**
 * Create an authenticated Supabase client from Authorization header.
 * 
 * This client respects RLS policies and should be used for:
 * - User-initiated operations
 * - Any data access that should respect row-level security
 * 
 * @param authHeader - The Authorization header value (e.g., "Bearer eyJ...")
 */
export function createAuthenticatedClient(
  authHeader: string,
  options?: ClientOptions
): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: options?.persistSession ?? false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
        ...options?.headers,
      },
    },
  });
}

/**
 * Create a BU-scoped authenticated client.
 * 
 * This client includes the x-current-bu-id header, enabling:
 * - current_bu_id() PostgreSQL function
 * - is_current_bu() helper
 * - BU-scoped RLS policies
 * 
 * @param authHeader - The Authorization header value
 * @param buId - The Business Unit ID to scope requests to
 */
export function createBuScopedClient(
  authHeader: string,
  buId: string,
  options?: ClientOptions
): SupabaseClient {
  return createAuthenticatedClient(authHeader, {
    ...options,
    headers: {
      ...options?.headers,
      "x-current-bu-id": buId,
    },
  });
}

/**
 * Create a minimal anonymous client for public operations.
 * 
 * This client uses the anon key without authentication.
 * Only use for truly public endpoints that don't require auth.
 */
export function createAnonClient(options?: ClientOptions): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: options?.persistSession ?? false,
      autoRefreshToken: false,
    },
    global: {
      headers: options?.headers,
    },
  });
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that an Authorization header is present and properly formatted
 */
export function validateAuthHeader(authHeader: string | null): authHeader is string {
  return !!authHeader && authHeader.startsWith("Bearer ");
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(authHeader: string): string {
  return authHeader.replace("Bearer ", "");
}

/**
 * Validate environment is properly configured for Edge Functions
 */
export function validateEnvironment(): void {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((name) => !Deno.env.get(name));
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
