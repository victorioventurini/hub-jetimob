import { toast } from "sonner";

/**
 * Extrai status HTTP e código de erro de uma FunctionsHttpError do supabase-js.
 * `error.context` é um `Response` clonável — lemos o body para obter `{ error }`.
 */
export async function parseEdgeFunctionError(error: unknown): Promise<{
  status: number | null;
  code: string | null;
  message: string;
}> {
  const e = error as { message?: string; context?: Response };
  const message = e?.message || "";
  let status: number | null = null;
  let code: string | null = null;
  let bodyMessage = "";

  if (e?.context && typeof e.context.json === "function") {
    status = e.context.status ?? null;
    try {
      const cloned = e.context.clone();
      const body = (await cloned.json()) as { error?: string; code?: string; message?: string };
      code = body?.error || body?.code || null;
      bodyMessage = body?.message || "";
    } catch {
      // ignore parse errors
    }
  }

  return {
    status,
    code,
    message: bodyMessage || message,
  };
}

/**
 * Toast padronizado para erros de edge functions que invocam Lovable AI.
 * Cobre 429 (rate limit), 402 (créditos), e mensagens específicas.
 * Retorna `true` se exibiu um toast específico, `false` para o caller mostrar fallback.
 */
export async function showAiEdgeFunctionErrorToast(
  error: unknown,
  fallbackMessage: string,
): Promise<void> {
  const { status, code, message } = await parseEdgeFunctionError(error);
  const lower = `${code ?? ""} ${message ?? ""}`.toLowerCase();

  if (status === 429 || code === "RATE_LIMITED" || lower.includes("rate limit") || lower.includes("429")) {
    toast.error("Limite de requisições da IA atingido. Aguarde 1–2 minutos e tente novamente.");
    return;
  }
  if (status === 402 || code === "CREDITS_DEPLETED" || lower.includes("credits") || lower.includes("402")) {
    toast.error("Créditos de IA esgotados. Contate o administrador do workspace.");
    return;
  }
  if (
    status === 503 ||
    code === "MODEL_OVERLOADED" ||
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("high demand") ||
    lower.includes("503")
  ) {
    toast.error("A IA está temporariamente sobrecarregada. Aguarde alguns segundos e tente novamente.");
    return;
  }

  toast.error(fallbackMessage);
}
