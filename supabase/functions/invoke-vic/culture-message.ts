// ============================================================================
// invoke-vic — culture_message normalization & length enforcement
// ============================================================================

import { llmComplete, type LLMConfig } from "../_shared/llm-client.ts";

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const MAX_CULTURE_MESSAGE_CHARS = 60;

function normalizeSingleLineText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWrappingQuotes(input: string): string {
  const s = input.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

export function normalizeCultureMessage(input: string): string {
  return stripWrappingQuotes(normalizeSingleLineText(input));
}

export type CultureRewriteResult =
  | { ok: true; content: string; usage: LLMUsage | undefined }
  | { ok: false; reason: "too_long" | "retry_failed"; content: string; usage: LLMUsage | undefined };

/**
 * Enforce hard char limit; if exceeded, ask the model to rewrite once.
 */
export async function enforceCultureMessageLimit(
  llmConfig: LLMConfig,
  systemPrompt: string,
  rawContent: string,
  baseUsage: LLMUsage | undefined,
  requestId: string,
): Promise<CultureRewriteResult> {
  let normalized = normalizeCultureMessage(rawContent);
  let usage = baseUsage;

  if (normalized.length <= MAX_CULTURE_MESSAGE_CHARS) {
    return { ok: true, content: normalized, usage };
  }

  try {
    const retry = await llmComplete(
      llmConfig,
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Reescreva a mensagem abaixo em até ${MAX_CULTURE_MESSAGE_CHARS} caracteres (incluindo espaços). ` +
            `Mantenha o sentido e o tom humano. ` +
            `Sem aspas, sem reticências, sem assinatura. ` +
            `Retorne APENAS a mensagem.\n\nMensagem: ${normalized}`,
        },
      ],
      { maxTokens: 120, temperature: 0.2 },
    );

    const retryContent = normalizeCultureMessage(retry.content || "");

    if (retry.usage && usage) {
      usage = {
        promptTokens: usage.promptTokens + retry.usage.promptTokens,
        completionTokens:
          usage.completionTokens + retry.usage.completionTokens,
        totalTokens: usage.totalTokens + retry.usage.totalTokens,
      };
    }

    if (retryContent && retryContent.length <= MAX_CULTURE_MESSAGE_CHARS) {
      return { ok: true, content: retryContent, usage };
    }

    return { ok: false, reason: "too_long", content: normalized, usage };
  } catch (retryError) {
    console.warn(
      `[${requestId}] Culture message rewrite retry failed:`,
      retryError,
    );
    return { ok: false, reason: "retry_failed", content: normalized, usage };
  }
}
