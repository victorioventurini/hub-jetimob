/**
 * Edge Functions Middleware
 * 
 * Centralized authentication, authorization, and logging for all Edge Functions.
 * This eliminates boilerplate code and ensures consistent security patterns.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CORS Headers - Standard for all functions
// ============================================================================
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Types
// ============================================================================
export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  user: AuthenticatedUser | null;
  buId: string | null;
  supabase: SupabaseClient;
  serviceClient: SupabaseClient;
}

export interface MiddlewareOptions {
  requireAuth?: boolean;
  requireBu?: boolean;
  validateBuAccess?: boolean;
  logRequest?: boolean;
}

export interface MiddlewareResult {
  success: boolean;
  context?: RequestContext;
  error?: Response;
}

interface ErrorDetails {
  requestId: string;
  error: string;
  code?: string;
}

// ============================================================================
// Response Helpers
// ============================================================================
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status: number, details?: ErrorDetails): Response {
  return new Response(
    JSON.stringify({ error: message, ...details }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// ============================================================================
// Client Creation Helpers
// ============================================================================
export function createAuthenticatedClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// Authentication
// ============================================================================
async function validateAuth(
  req: Request,
  requestId: string
): Promise<{ user: AuthenticatedUser; supabase: SupabaseClient } | Response> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(`[${requestId}] Missing or invalid authorization header`);
    return errorResponse("Missing authorization header", 401, { requestId, error: "UNAUTHORIZED" });
  }

  const supabase = createAuthenticatedClient(authHeader);
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error(`[${requestId}] Auth error:`, userError?.message);
    return errorResponse("Unauthorized", 401, { requestId, error: "INVALID_TOKEN" });
  }

  return {
    user: {
      id: user.id,
      email: user.email || "",
      role: user.role,
    },
    supabase,
  };
}

// ============================================================================
// BU Access Validation
// ============================================================================
async function validateBuAccess(
  supabase: SupabaseClient,
  userId: string,
  buId: string,
  requestId: string
): Promise<boolean | Response> {
  // Identity convention: BU membership is anchored on profiles.id (domain), not auth.users.id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError) {
    console.error(`[${requestId}] Profile lookup error:`, profileError.message);
    return errorResponse("Internal error", 500, { requestId, error: "PROFILE_LOOKUP_FAILED" });
  }

  if (!profile?.id) {
    console.error(`[${requestId}] No profile found for user ${userId}`);
    return errorResponse("Access denied", 403, { requestId, error: "PROFILE_NOT_FOUND" });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("bu_user_memberships")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .maybeSingle();

  if (membershipError) {
    console.error(`[${requestId}] BU access check error:`, membershipError.message);
    return errorResponse("Internal error", 500, { requestId, error: "BU_CHECK_FAILED" });
  }

  if (!membership) {
    console.error(`[${requestId}] User ${userId} denied access to BU ${buId}`);
    return errorResponse("Access denied to this BU", 403, { requestId, error: "BU_ACCESS_DENIED" });
  }

  return true;
}

// ============================================================================
// Main Middleware Function
// ============================================================================
export async function withMiddleware(
  req: Request,
  options: MiddlewareOptions = {}
): Promise<MiddlewareResult> {
  const {
    requireAuth = true,
    requireBu = false,
    validateBuAccess: shouldValidateBu = false,
    logRequest = true,
  } = options;

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return { success: false, error: corsResponse() };
  }

  // Create service client (always available)
  const serviceClient = createServiceClient();

  // Initialize context
  const context: RequestContext = {
    requestId,
    startTime,
    user: null,
    buId: null,
    supabase: serviceClient, // Default to service client
    serviceClient,
  };

  // Authenticate if required
  if (requireAuth) {
    const authResult = await validateAuth(req, requestId);
    
    if (authResult instanceof Response) {
      return { success: false, error: authResult };
    }
    
    context.user = authResult.user;
    context.supabase = authResult.supabase;
  }

  // Extract BU ID from request body if needed
  if (requireBu || shouldValidateBu) {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();
      context.buId = body.bu_id || body.buId || null;
    } catch {
      // Body might not be JSON or might be empty
    }

    if (requireBu && !context.buId) {
      console.error(`[${requestId}] BU ID required but not provided`);
      return {
        success: false,
        error: errorResponse("BU ID is required", 400, { requestId, error: "BU_REQUIRED" }),
      };
    }
  }

  // Validate BU access if required
  if (shouldValidateBu && context.user && context.buId) {
    const accessResult = await validateBuAccess(
      context.supabase,
      context.user.id,
      context.buId,
      requestId
    );
    
    if (accessResult instanceof Response) {
      return { success: false, error: accessResult };
    }
  }

  // Log request
  if (logRequest) {
    console.log(`[${requestId}] ${req.method} - User: ${context.user?.id || "anonymous"} - BU: ${context.buId || "none"}`);
  }

  return { success: true, context };
}

// ============================================================================
// Logging Helper
// ============================================================================
export function logRequestCompletion(context: RequestContext, status: "success" | "error", details?: string): void {
  const latencyMs = Date.now() - context.startTime;
  const level = status === "error" ? "ERROR" : "INFO";
  
  console.log(
    `[${context.requestId}] [${level}] Completed in ${latencyMs}ms - ${status.toUpperCase()}${details ? ` - ${details}` : ""}`
  );
}

// ============================================================================
// Rate Limiting Helper (for AI/expensive operations)
// ============================================================================
export interface RateLimitConfig {
  maxPerUserPerDay?: number;
  maxPerBuPerDay?: number;
}

export async function checkRateLimits(
  supabase: SupabaseClient,
  userId: string | null,
  buId: string | null,
  config: RateLimitConfig,
  requestId: string
): Promise<Response | null> {
  if (!buId) return null;

  // Get IA config for BU
  const { data: iaConfig } = await supabase
    .from("bu_ia_config")
    .select("ia_enabled, max_calls_per_user_day, max_calls_per_bu_day")
    .eq("bu_id", buId)
    .maybeSingle();

  if (iaConfig && !iaConfig.ia_enabled) {
    return errorResponse("IA is disabled for this BU", 403, { 
      requestId, 
      error: "IA_DISABLED",
      code: "IA_DISABLED" 
    });
  }

  const maxPerUser = config.maxPerUserPerDay || iaConfig?.max_calls_per_user_day;
  const maxPerBu = config.maxPerBuPerDay || iaConfig?.max_calls_per_bu_day;

  // Check user limit
  if (maxPerUser && userId) {
    const { data: userCalls } = await supabase.rpc("count_user_calls_today", {
      p_user_id: userId,
      p_bu_id: buId,
    });
    
    if (userCalls >= maxPerUser) {
      return errorResponse("Daily user limit reached", 429, {
        requestId,
        error: "USER_LIMIT_REACHED",
        code: "USER_LIMIT_REACHED",
      });
    }
  }

  // Check BU limit
  if (maxPerBu) {
    const { data: buCalls } = await supabase.rpc("count_bu_calls_today", {
      p_bu_id: buId,
    });
    
    if (buCalls >= maxPerBu) {
      return errorResponse("Daily BU limit reached", 429, {
        requestId,
        error: "BU_LIMIT_REACHED",
        code: "BU_LIMIT_REACHED",
      });
    }
  }

  return null;
}
