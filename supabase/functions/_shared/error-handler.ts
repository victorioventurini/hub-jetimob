/**
 * Centralized Error Handler for Edge Functions
 * 
 * Provides consistent error responses across all Edge Functions.
 * Uses standard HTTP status codes and error codes.
 */

import { corsHeaders } from "./cors.ts";

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode = 
  // Auth errors
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "FORBIDDEN"
  | "BU_ACCESS_DENIED"
  // Validation errors
  | "VALIDATION_ERROR"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_FORMAT"
  | "INVALID_UUID"
  // Resource errors
  | "NOT_FOUND"
  | "AGENT_NOT_FOUND"
  | "PROFILE_NOT_FOUND"
  | "RESOURCE_NOT_FOUND"
  // Rate limiting
  | "RATE_LIMIT"
  | "USER_LIMIT_REACHED"
  | "BU_LIMIT_REACHED"
  // AI/External service errors
  | "AI_API_ERROR"
  | "AI_NOT_CONFIGURED"
  | "AI_OUTPUT_TOO_LONG"
  | "EMPTY_AI_RESPONSE"
  | "NO_CREDITS"
  | "AGENT_DISABLED"
  // Generic errors
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "SERVICE_UNAVAILABLE";

export interface ErrorDetails {
  requestId: string;
  code: ErrorCode;
  context?: string;
  details?: Record<string, unknown>;
}

export interface StructuredError {
  message: string;
  code: ErrorCode;
  requestId: string;
  timestamp: string;
  context?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Code to HTTP Status Mapping
// ============================================================================

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // 400 Bad Request
  VALIDATION_ERROR: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_FORMAT: 400,
  INVALID_UUID: 400,
  BAD_REQUEST: 400,
  
  // 401 Unauthorized
  UNAUTHORIZED: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  
  // 403 Forbidden
  FORBIDDEN: 403,
  BU_ACCESS_DENIED: 403,
  AGENT_DISABLED: 403,
  
  // 404 Not Found
  NOT_FOUND: 404,
  AGENT_NOT_FOUND: 404,
  PROFILE_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  
  // 429 Too Many Requests
  RATE_LIMIT: 429,
  USER_LIMIT_REACHED: 429,
  BU_LIMIT_REACHED: 429,
  
  // 402 Payment Required
  NO_CREDITS: 402,
  
  // 500 Internal Server Error
  INTERNAL_ERROR: 500,
  AI_NOT_CONFIGURED: 500,
  
  // 502 Bad Gateway
  AI_API_ERROR: 502,
  AI_OUTPUT_TOO_LONG: 502,
  EMPTY_AI_RESPONSE: 502,
  
  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// Error Messages (Portuguese)
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  UNAUTHORIZED: "Autenticação necessária",
  INVALID_TOKEN: "Token inválido",
  TOKEN_EXPIRED: "Token expirado",
  FORBIDDEN: "Acesso negado",
  BU_ACCESS_DENIED: "Acesso negado a esta BU",
  
  // Validation
  VALIDATION_ERROR: "Erro de validação",
  MISSING_REQUIRED_FIELD: "Campo obrigatório ausente",
  INVALID_FORMAT: "Formato inválido",
  INVALID_UUID: "UUID inválido",
  
  // Resources
  NOT_FOUND: "Recurso não encontrado",
  AGENT_NOT_FOUND: "Agente não encontrado",
  PROFILE_NOT_FOUND: "Perfil não encontrado",
  RESOURCE_NOT_FOUND: "Recurso não encontrado",
  
  // Rate limiting
  RATE_LIMIT: "Limite de requisições excedido",
  USER_LIMIT_REACHED: "Limite diário do usuário atingido",
  BU_LIMIT_REACHED: "Limite diário da BU atingido",
  
  // AI/External
  AI_API_ERROR: "Erro no serviço de IA",
  AI_NOT_CONFIGURED: "Serviço de IA não configurado",
  AI_OUTPUT_TOO_LONG: "Resposta da IA muito longa",
  EMPTY_AI_RESPONSE: "Resposta vazia da IA",
  NO_CREDITS: "Créditos de IA esgotados",
  AGENT_DISABLED: "Agente desabilitado para esta BU",
  
  // Generic
  INTERNAL_ERROR: "Erro interno do servidor",
  BAD_REQUEST: "Requisição inválida",
  SERVICE_UNAVAILABLE: "Serviço temporariamente indisponível",
};

// ============================================================================
// Main Error Handler Functions
// ============================================================================

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: ErrorCode,
  requestId: string,
  options?: {
    message?: string;
    context?: string;
    details?: Record<string, unknown>;
  }
): Response {
  const status = ERROR_STATUS_MAP[code] || 500;
  const message = options?.message || ERROR_MESSAGES[code] || "Erro desconhecido";
  
  const body: StructuredError = {
    message,
    code,
    requestId,
    timestamp: new Date().toISOString(),
  };
  
  if (options?.context) {
    body.context = options.context;
  }
  
  if (options?.details) {
    body.details = options.details;
  }
  
  // Log error for debugging
  console.error(`[${requestId}] [${code}] ${message}`, options?.details || "");
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Handle unknown errors and convert to structured response
 */
export function handleUnknownError(
  error: unknown,
  requestId: string,
  context?: string
): Response {
  // Log full error for debugging
  console.error(`[${requestId}] Unhandled error:`, error);
  
  // Extract message if possible
  let message = "Erro interno do servidor";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }
  
  return createErrorResponse("INTERNAL_ERROR", requestId, {
    message,
    context,
  });
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandling(
  handler: (req: Request, requestId: string) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get("x-correlation-id") || crypto.randomUUID();
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      return await handler(req, requestId);
    } catch (error) {
      return handleUnknownError(error, requestId);
    }
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[],
  requestId: string
): Response | null {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      missingFields.push(String(field));
    }
  }
  
  if (missingFields.length > 0) {
    return createErrorResponse("MISSING_REQUIRED_FIELD", requestId, {
      message: `Campos obrigatórios ausentes: ${missingFields.join(", ")}`,
      details: { missingFields },
    });
  }
  
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(
  value: string | undefined | null,
  fieldName: string,
  requestId: string
): Response | null {
  if (!value) return null; // Let validateRequiredFields handle missing values
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    return createErrorResponse("INVALID_UUID", requestId, {
      message: `Formato de UUID inválido para campo: ${fieldName}`,
      details: { field: fieldName, value },
    });
  }
  
  return null;
}
