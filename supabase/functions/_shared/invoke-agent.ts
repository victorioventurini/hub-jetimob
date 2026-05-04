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
 * Invoke an AI agent directly using shared modules.
 * Bypasses invoke-vic HTTP calls and doesn't require a user JWT.
 * Respects model/provider configured in hub_integrations_global_config.
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

  const llmConfig = await resolveLLMConfig(serviceClient, loaded.agent.model_name);
  if (!llmConfig) {
    console.error(`[${requestId}] No LLM config resolved for agent ${agentSlug}`);
    if (options.throwOnMissingConfig === false) return "";
    throw new Error(`NO_LLM_CONFIG for ${agentSlug}`);
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

  const maxTokens = options.maxTokens ?? loaded.agent.max_tokens ?? llmConfig.maxTokens;
  const temperature = options.temperature ?? loaded.agent.temperature ?? llmConfig.temperature;

  console.log(`[${requestId}] Calling LLM for agent ${agentSlug} (model: ${llmConfig.model})`);
  const response = await llmComplete(llmConfig, messages, { maxTokens, temperature });
  return response.content || "";
}
