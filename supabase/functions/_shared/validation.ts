/**
 * Validation schemas for Edge Functions
 * 
 * Uses Zod for runtime validation of incoming payloads
 * to prevent crashes from malformed data and enforce type safety.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// INVOKE-VIC SCHEMAS
// ============================================================================

export const AgentContextSchema = z.object({
  type: z.string().min(1).max(100),
}).passthrough();

export const InvokeVicRequestSchema = z.object({
  agentSlug: z.string().min(1).max(50),
  actionContext: z.string().min(1).max(100),
  buId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  context: AgentContextSchema,
  userQuestion: z.string().max(10000).optional(),
  stream: z.boolean().default(false),
});

export type InvokeVicRequest = z.infer<typeof InvokeVicRequestSchema>;

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500).trim(),
});

export const SearchAddressQuerySchema = z.object({
  query: z.string().min(3).max(500).trim(),
});

export const SearchCitiesQuerySchema = z.object({
  query: z.string().min(2).max(200).trim(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse JSON with error handling
 * Returns null if parsing fails
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Parse and validate request body with Zod schema
 * Returns typed result or throws ZodError
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  try {
    const rawBody = await req.json();
    const result = schema.safeParse(rawBody);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    // JSON parse failed
    return {
      success: false,
      error: new z.ZodError([{
        code: z.ZodIssueCode.custom,
        message: "Invalid JSON body",
        path: [],
      }]),
    };
  }
}

/**
 * Format Zod validation errors for user-friendly response
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

/**
 * Validate tool call arguments safely
 * Returns parsed args or null if invalid
 */
export function validateToolCallArgs(args: string): Record<string, unknown> | null {
  const parsed = safeJsonParse<Record<string, unknown>>(args);
  
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  
  return parsed;
}
