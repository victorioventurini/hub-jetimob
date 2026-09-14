import { ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import type { PostgrestError } from "@supabase/supabase-js";

/** Resposta padrão das ferramentas: JSON legível + conteúdo estruturado. */
export function jsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as unknown as JsonValueInput,
  };
}

/** Converte erro do Postgrest em erro de ferramenta com mensagem em PT-BR. */
export function assertNoError(error: PostgrestError | null, what: string): void {
  if (!error) return;
  if (error.code === "42501" || error.code === "PGRST301") {
    throw new ToolError(`Sem permissão para consultar ${what} nesta unidade.`);
  }
  throw new ToolError(`Erro ao consultar ${what}: ${error.message}`);
}

export function clampLimit(limit: number | null | undefined, fallback = 50, max = 200): number {
  const value = Number(limit ?? fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.trunc(value), max);
}
