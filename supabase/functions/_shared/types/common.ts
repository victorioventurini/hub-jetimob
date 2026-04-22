/**
 * Shared types for edge functions.
 *
 * Centralizes Supabase client typing and recurring shapes used across
 * `supabase/functions/*` to keep individual functions free of `any`.
 *
 * @module _shared/types/common
 */

import type { SupabaseClient as RawSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Service-role / authenticated Supabase client used by edge functions.
 *
 * Edge functions don't have access to the generated `Database` type
 * (it lives in `src/integrations/supabase/types.ts`), so we use the
 * untyped client. `unknown` would be too restrictive for chained queries,
 * so we keep the raw client signature without further parameterization.
 */
export type EdgeSupabaseClient = RawSupabaseClient;

/**
 * Generic JSON value that comes back from Supabase JSONB columns or
 * unknown LLM payloads. Prefer this over `any` for fields whose shape
 * isn't statically known.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Standard error shape attached to thrown errors when an HTTP-style
 * status is involved (LLM gateway, third-party APIs).
 */
export interface HttpLikeError extends Error {
  status?: number;
  body?: string;
}

/**
 * JWT claims returned by `supabase.auth.getClaims()`.
 */
export interface AuthClaims {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Generic record type for free-form objects (e.g. metadata, payloads).
 */
export type UnknownRecord = Record<string, unknown>;
