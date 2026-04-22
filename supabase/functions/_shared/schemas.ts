/**
 * Shared Zod Schemas — validação reutilizável entre edge functions.
 *
 * Centraliza schemas que aparecem em várias funções (paginação, filtros BU,
 * períodos quarterly). Importe daqui em vez de duplicar.
 *
 * @module _shared/schemas
 */

import { z } from "https://esm.sh/zod@3.23.8";

// ============================================================================
// Identificadores
// ============================================================================

export const UuidSchema = z.string().uuid("UUID inválido");

export const BuIdSchema = UuidSchema;

export const ProfileIdSchema = UuidSchema;

// ============================================================================
// Paginação
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ============================================================================
// Filtros BU-scoped
// ============================================================================

export const BuScopedFilterSchema = z.object({
  buId: BuIdSchema,
});

export type BuScopedFilter = z.infer<typeof BuScopedFilterSchema>;

// ============================================================================
// Períodos / Quarter
// ============================================================================

/** Quarter no formato `2026-Q1`. */
export const QuarterSchema = z
  .string()
  .regex(/^\d{4}-Q[1-4]$/, "Quarter inválido (esperado: YYYY-QN)");

export const QuarterFilterSchema = z.object({
  quarter: QuarterSchema,
  year: z.coerce.number().int().min(2020).max(2099),
});

export type QuarterFilter = z.infer<typeof QuarterFilterSchema>;

/** Range de datas ISO (inclusive). */
export const DateRangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .refine((d) => new Date(d.from) <= new Date(d.to), {
    message: "from deve ser <= to",
  });

export type DateRange = z.infer<typeof DateRangeSchema>;

// ============================================================================
// Idempotência / correlação
// ============================================================================

export const CorrelationIdSchema = z.string().min(8).max(128);

export const IdempotencyKeySchema = z.string().min(8).max(128);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wrap padrão para validação de body. Devolve { ok: true, data } ou
 * { ok: false, response } pronto para retornar.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "JSON inválido no body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Validação falhou", issues: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
