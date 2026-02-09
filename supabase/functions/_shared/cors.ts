/**
 * CORS Headers — Single Source of Truth
 *
 * Extracted from middleware.ts to break the circular dependency:
 *   middleware.ts → response.ts → middleware.ts (corsHeaders)
 *
 * All Edge Functions and shared modules should import corsHeaders from here.
 *
 * @module _shared/cors
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-current-bu-id, x-correlation-id, x-cron-secret, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
