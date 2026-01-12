/**
 * Response Helpers for Edge Functions
 * 
 * Standardized response builders for consistent API responses.
 * Use these instead of manually constructing Response objects.
 * 
 * @example Success response
 * ```ts
 * return successResponse({ user: userData });
 * ```
 * 
 * @example Error response
 * ```ts
 * return errorResponse("User not found", 404, "USER_NOT_FOUND");
 * ```
 * 
 * @example Paginated response
 * ```ts
 * return paginatedResponse(items, { page: 1, pageSize: 20, total: 100 });
 * ```
 */

import { corsHeaders } from "./middleware.ts";

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Create a successful JSON response
 */
export function successResponse<T>(
  data: T, 
  meta?: Record<string, unknown>,
  status = 200
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  
  if (meta && Object.keys(meta).length > 0) {
    body.meta = meta;
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create a paginated response with metadata
 */
export function paginatedResponse<T>(
  items: T[],
  pagination: { page: number; pageSize: number; total: number },
  additionalMeta?: Record<string, unknown>
): Response {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  const meta: PaginationMeta & Record<string, unknown> = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrev: pagination.page > 1,
    ...additionalMeta,
  };
  
  return successResponse(items, meta);
}

/**
 * Create a response for created resources (201)
 */
export function createdResponse<T>(data: T, location?: string): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
  
  if (location) {
    headers["Location"] = location;
  }
  
  return new Response(JSON.stringify({ success: true, data }), {
    status: 201,
    headers,
  });
}

/**
 * Create a no-content response (204)
 */
export function noContentResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      message,
    },
  };
  
  if (code) {
    body.error.code = code;
  }
  
  if (details) {
    body.error.details = details;
  }
  
  if (requestId) {
    body.requestId = requestId;
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(
  message: string,
  code = "BAD_REQUEST",
  details?: Record<string, unknown>
): Response {
  return errorResponse(message, 400, code, details);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(
  message = "Authentication required",
  code = "UNAUTHORIZED"
): Response {
  return errorResponse(message, 401, code);
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(
  message = "Access denied",
  code = "FORBIDDEN"
): Response {
  return errorResponse(message, 403, code);
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(
  message = "Resource not found",
  code = "NOT_FOUND"
): Response {
  return errorResponse(message, 404, code);
}

/**
 * Create a 409 Conflict response
 */
export function conflictResponse(
  message: string,
  code = "CONFLICT"
): Response {
  return errorResponse(message, 409, code);
}

/**
 * Create a 429 Rate Limited response
 */
export function rateLimitedResponse(
  message = "Too many requests",
  retryAfterSeconds?: number
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
  
  if (retryAfterSeconds) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: "RATE_LIMITED" },
    }),
    { status: 429, headers }
  );
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalErrorResponse(
  message = "Internal server error",
  requestId?: string
): Response {
  return errorResponse(message, 500, "INTERNAL_ERROR", undefined, requestId);
}

/**
 * Create a 503 Service Unavailable response
 */
export function serviceUnavailableResponse(
  message = "Service temporarily unavailable",
  retryAfterSeconds?: number
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
  
  if (retryAfterSeconds) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: "SERVICE_UNAVAILABLE" },
    }),
    { status: 503, headers }
  );
}

// =============================================================================
// UTILITY RESPONSES
// =============================================================================

/**
 * Create a CORS preflight response
 */
export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create a redirect response
 */
export function redirectResponse(url: string, permanent = false): Response {
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      ...corsHeaders,
      Location: url,
    },
  });
}

/**
 * Create a health check response
 */
export function healthResponse(
  status: "healthy" | "degraded" | "unhealthy" = "healthy",
  details?: Record<string, unknown>
): Response {
  const statusCode = status === "unhealthy" ? 503 : 200;
  
  return new Response(
    JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      ...details,
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
