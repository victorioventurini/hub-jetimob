// Shared helper to invoke an AI agent directly (no HTTP invoke-vic dependency).
// Used by edge functions like team-checkin-summary, analysis-generate, mbr-summary, etc.

import type { EdgeSupabaseClient } from "./types/common.ts";
import { loadAgent, buildSystemPrompt } from "./agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "./llm-client.ts";

export interface InvokeAgentOptions {
  /** Throw on missing LLM config (default true). When false, returns "" silently. */
  throwOnMissingConfig?: boolean;
  /** Override agent's max_tokens. */
  maxTokens?: number;
  /** Override agent's temperature. */
  temperature?: number;
}

/**
 * Cadeia de fallback usada quando o modelo preferido do agente falha
 * por rate-limit (429), créditos (402) ou sobrecarga (503).
 *
 * Mistura provedores (Google → OpenAI) e tamanhos (flash → lite → nano)
 * para maximizar a chance de sucesso quando o Gateway está saturado em
 * um provider específico. Modelos já tentados são ignorados.
 */
const FALLBACK_MODEL_CHAIN = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

function isTransientLlmError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 402 || status === 503 || status === 504) return true;
  const body = String((err as { body?: string })?.body ?? "").toLowerCase();
  return /rate.?limit|overloaded|unavailable|high demand|quota|credits/.test(body);
}

/**
 * Invoke an AI agent directly using shared modules.
 * Bypasses invoke-vic HTTP calls and doesn't require a user JWT.
 * Respects model/provider configured in hub_integrations_global_config.
 *
 * If the preferred model fails with a transient error (429/402/503), retries
 * the same prompt against a fallback chain of alternative models/providers.
 *
 * Returns the LLM string response, or "" when the agent is missing/disabled.
 */
export async function invokeAgentDirect(
  serviceClient: EdgeSupabaseClient,
  agentSlug: string,
  userPromptContent: string,
  buId: string,
  requestId: string,
  options: InvokeAgentOptions = {},
): Promise<string> {
  const loaded = await loadAgent(serviceClient, agentSlug, buId, requestId);
  if (!loaded) {
    console.warn(`[${requestId}] Agent ${agentSlug} not found, using fallback`);
    return "";
  }
  if (!loaded.isEnabledInBu) {
    console.warn(`[${requestId}] Agent ${agentSlug} disabled for BU ${buId}`);
    return "";
  }

  const systemPrompt = await buildSystemPrompt(
    serviceClient,
    loaded.agent,
    loaded.effectiveSystemPrompt,
    buId,
    requestId,
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPromptContent },
  ];

  const preferredModel = loaded.agent.model_name ?? null;
  const tried = new Set<string>();
  const candidates: (string | null)[] = [preferredModel, ...FALLBACK_MODEL_CHAIN];

  let lastError: unknown = null;

  for (const candidateModel of candidates) {
    const key = candidateModel ?? "__default__";
    if (tried.has(key)) continue;
    tried.add(key);

    const llmConfig = await resolveLLMConfig(serviceClient, candidateModel);
    if (!llmConfig) {
      console.error(`[${requestId}] No LLM config resolved for agent ${agentSlug} (model=${candidateModel ?? "default"})`);
      continue;
    }

    const maxTokens = options.maxTokens ?? loaded.agent.max_tokens ?? llmConfig.maxTokens;
    const temperature = options.temperature ?? loaded.agent.temperature ?? llmConfig.temperature;

    try {
      console.log(`[${requestId}] Calling LLM for agent ${agentSlug} (model: ${llmConfig.model})`);
      const response = await llmComplete(llmConfig, messages, { maxTokens, temperature });
      return response.content || "";
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (isTransientLlmError(err)) {
        console.warn(
          `[${requestId}] Agent ${agentSlug} failed on ${llmConfig.model} (status=${status ?? "?"}). Trying fallback model…`,
        );
        continue;
      }
      // Erro não-transitório: aborta a cadeia e propaga.
      throw err;
    }
  }

  if (options.throwOnMissingConfig === false) {
    console.warn(`[${requestId}] All fallback models exhausted for agent ${agentSlug}, returning empty string.`);
    return "";
  }
  throw (lastError ?? new Error(`NO_LLM_CONFIG for ${agentSlug}`));
}
