/**
 * LLM Client - Unified interface for AI providers
 * Handles OpenAI and Lovable AI Gateway
 */

import { corsHeaders } from "./cors.ts";
import type { EdgeSupabaseClient } from "./types/common.ts";

export interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
}

export interface LLMTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  rawMessage: unknown;
}

export interface StreamMetadata {
  agentName: string;
  agentSlug: string;
  latencyMs?: number;
  tokensUsed?: number;
}

/**
 * Get integration API key from hub_integrations_global_config
 */
export async function getIntegrationApiKey(
  serviceClient: EdgeSupabaseClient,
  integrationKey: string
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching ${integrationKey} config:`, error);
    return null;
  }

  if (!data || !data.is_enabled_global) {
    return null;
  }

  const config = data.config_encrypted as { api_key?: string } | null;
  return config?.api_key || null;
}

/**
 * Get Google API key from the chatgpt integration config
 */
export async function getGoogleApiKey(
  serviceClient: EdgeSupabaseClient
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", "chatgpt")
    .maybeSingle();

  if (error || !data || !data.is_enabled_global) {
    return null;
  }

  const config = data.config_encrypted as {
    google_api_key?: string;
    google_source?: string;
  } | null;

  // Only return the key if the user chose 'own_key' mode
  if (config?.google_source === "own_key" && config?.google_api_key) {
    return config.google_api_key;
  }
  return null;
}

/**
 * Check if OpenAI source is set to 'own_key' in config
 */
async function getOpenAISourcePreference(
  serviceClient: EdgeSupabaseClient
): Promise<{ apiKey: string | null; useOwnKey: boolean }> {
  const { data, error } = await serviceClient
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", "chatgpt")
    .maybeSingle();

  if (error || !data || !data.is_enabled_global) {
    return { apiKey: null, useOwnKey: false };
  }

  const config = data.config_encrypted as {
    api_key?: string;
    openai_source?: string;
  } | null;

  return {
    apiKey: config?.api_key || null,
    useOwnKey: config?.openai_source === "own_key",
  };
}

/**
 * Resolve LLM configuration based on model prefix (multi-provider routing).
 *
 * Routing rules:
 *  • google/* → Own Google API Key (if configured) → Gateway fallback
 *  • openai/* → Own OpenAI Key (if configured) → Gateway fallback
 *  • gpt-* (legacy) → OpenAI Direct if API Key exists, else Gateway fallback
 *  • null / unknown → Gateway with default model
 */
export async function resolveLLMConfig(
  serviceClient: EdgeSupabaseClient,
  preferredModel: string | null
): Promise<LLMConfig | null> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
  const GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const DEFAULT_MODEL = "google/gemini-3.5-flash";

  // Determine provider by model prefix
  const modelPrefix = preferredModel?.split("/")[0];
  const isGoogleModel = modelPrefix === "google";
  const isOpenAIGatewayModel = modelPrefix === "openai";
  const isLegacyGptModel = preferredModel?.startsWith("gpt-");

  // 1. Google models: prefer own key if configured
  if (isGoogleModel) {
    const googleApiKey = await getGoogleApiKey(serviceClient);
    if (googleApiKey) {
      // Strip "google/" prefix for direct Google API
      const googleModelName = preferredModel!.replace("google/", "");
      return {
        apiUrl: GOOGLE_URL,
        apiKey: googleApiKey,
        model: googleModelName,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
    // Fallback to Gateway
    if (lovableApiKey) {
      return {
        apiUrl: GATEWAY_URL,
        apiKey: lovableApiKey,
        model: preferredModel!,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
  }

  // 2. OpenAI gateway models: prefer own key if configured
  if (isOpenAIGatewayModel) {
    const { apiKey: openAIKey, useOwnKey } = await getOpenAISourcePreference(serviceClient);
    if (useOwnKey && openAIKey) {
      // Strip "openai/" prefix for direct OpenAI API
      const openaiModelName = preferredModel!.replace("openai/", "");
      return {
        apiUrl: OPENAI_URL,
        apiKey: openAIKey,
        model: openaiModelName,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
    // Fallback to Gateway
    if (lovableApiKey) {
      return {
        apiUrl: GATEWAY_URL,
        apiKey: lovableApiKey,
        model: preferredModel!,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
  }

  // 3. Legacy GPT models: prefer OpenAI Direct, fallback to Gateway
  if (isLegacyGptModel) {
    const openAIApiKey = await getIntegrationApiKey(serviceClient, "chatgpt");
    if (openAIApiKey) {
      return {
        apiUrl: OPENAI_URL,
        apiKey: openAIApiKey,
        model: preferredModel!,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
    if (lovableApiKey) {
      return {
        apiUrl: GATEWAY_URL,
        apiKey: lovableApiKey,
        model: DEFAULT_MODEL,
        maxTokens: 800,
        temperature: 0.7,
      };
    }
  }

  // 4. Default fallback: Gateway with default model
  if (lovableApiKey) {
    return {
      apiUrl: GATEWAY_URL,
      apiKey: lovableApiKey,
      model: preferredModel || DEFAULT_MODEL,
      maxTokens: 800,
      temperature: 0.7,
    };
  }

  return null;
}

/**
 * Make a non-streaming LLM request.
 *
 * W2.P2.2 — Cache em memória (TTL 5min) para prompts determinísticos.
 * Apenas chamadas com `temperature ≤ 0.3` e SEM tools são cacheadas — isso
 * cobre validadores e classificadores chamados em loop sem afetar
 * gerações criativas.
 */
const llmCache = new Map<string, { value: LLMResponse; expiresAt: number }>();
const LLM_CACHE_TTL_MS = 5 * 60 * 1000;

function buildCacheKey(model: string, messages: LLMMessage[], maxTokens: number): string {
  // Hash leve baseado em model + último user message + tamanho do system prompt.
  // Suficiente pra evitar colisão dentro de um cold start.
  const sys = messages.find((m) => m.role === "system")?.content?.length ?? 0;
  const lastUser = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
  return `${model}|${maxTokens}|sys:${sys}|u:${lastUser}`;
}

function pruneLlmCache(): void {
  const now = Date.now();
  for (const [k, v] of llmCache) {
    if (v.expiresAt < now) llmCache.delete(k);
  }
}

/**
 * Default timeout para chamadas LLM síncronas (não-streaming).
 * Edge Functions podem definir um valor menor via `options.timeoutMs`
 * (ex.: validadores rápidos com 15s; relatórios pesados com 60s).
 *
 * W1.B.1 — Sem timeout uma chamada pendurada pode segurar uma instância
 * Edge inteira até o teto de 150s do gateway, multiplicando custo e
 * latência percebida. Com AbortController encerramos o fetch de forma
 * controlada e a exception sobe normal.
 */
const DEFAULT_LLM_TIMEOUT_MS = 60_000;

/**
 * OpenAI GPT-5 family rejects `max_tokens` and requires `max_completion_tokens`.
 * Gemini and older OpenAI models still accept `max_tokens`.
 */
function buildTokenLimitField(model: string, maxTokens: number): Record<string, number> {
  // GPT-5 family rejects `max_tokens` whether routed via Gateway (`openai/gpt-5*`)
  // or OpenAI Direct (prefix stripped → `gpt-5*`).
  if (/^(openai\/)?gpt-5/i.test(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

/**
 * Some reasoning OpenAI models only accept the provider default temperature.
 * Omitting the field avoids 400 `unsupported_value` errors while keeping
 * deterministic temperature control for Gemini and older OpenAI models.
 */
function buildTemperatureField(model: string, temperature: number): Record<string, number> {
  if (/^(openai\/)?gpt-5/i.test(model) && temperature !== 1) return {};
  return { temperature };
}

export async function llmComplete(
  config: LLMConfig,
  messages: LLMMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    tools?: LLMTool[];
    toolChoice?: string | { type: string; function: { name: string } };
    /** Timeout em ms para a chamada HTTP. Default 60s. */
    timeoutMs?: number;
    /** AbortSignal externo (encadeado com o timeout interno). */
    signal?: AbortSignal;
  }
): Promise<LLMResponse> {
  const maxTokens = options?.maxTokens ?? config.maxTokens;
  const temperature = options?.temperature ?? config.temperature;

  // Cache só é seguro pra prompts determinísticos sem tool-calls.
  const cacheable = !options?.tools?.length && temperature <= 0.3;
  const cacheKey = cacheable ? buildCacheKey(config.model, messages, maxTokens) : null;

  if (cacheKey) {
    const hit = llmCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
  }

  const payload: Record<string, unknown> = {
    model: config.model,
    messages,
    ...buildTokenLimitField(config.model, maxTokens),
    ...buildTemperatureField(config.model, temperature),
  };

  if (options?.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = options.toolChoice ?? "auto";
  }

  // W1.B.1 — Timeout via AbortController, encadeado com signal externo.
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  // Retry transient upstream issues (503 UNAVAILABLE / "overloaded") with backoff.
  // Não retenta 4xx (incl. 429/402) — esses precisam subir intactos.
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [800, 2400];
  let response: Response | null = null;
  let lastErrorText = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === "AbortError") {
        const e = new Error(`LLM API timeout after ${timeoutMs}ms`) as Error & {
          status: number;
          body: string;
        };
        e.status = 504;
        e.body = "timeout";
        throw e;
      }
      throw err;
    }

    if (response.ok) break;

    lastErrorText = await response.text();
    const isTransient =
      response.status === 503 ||
      /UNAVAILABLE|overloaded|high demand/i.test(lastErrorText);

    if (!isTransient || attempt === MAX_ATTEMPTS - 1) {
      clearTimeout(timeoutId);
      const error = new Error(`LLM API error: ${response.status}`) as Error & {
        status: number;
        body: string;
      };
      error.status = response.status;
      error.body = lastErrorText;
      throw error;
    }

    console.warn(
      `[llmComplete] Upstream ${response.status} (transient), retrying in ${BACKOFF_MS[attempt]}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
    );
    await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
  }

  clearTimeout(timeoutId);

  if (!response || !response.ok) {
    const error = new Error(`LLM API error: ${response?.status ?? "unknown"}`) as Error & {
      status: number;
      body: string;
    };
    error.status = response?.status ?? 503;
    error.body = lastErrorText;
    throw error;
  }

  const data = await response.json();

  const result: LLMResponse = {
    content: data.choices?.[0]?.message?.content ?? null,
    toolCalls: data.choices?.[0]?.message?.tool_calls ?? null,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : null,
    rawMessage: data.choices?.[0]?.message,
  };

  if (cacheKey) {
    pruneLlmCache();
    llmCache.set(cacheKey, { value: result, expiresAt: Date.now() + LLM_CACHE_TTL_MS });
  }

  return result;
}

/**
 * Create a streaming LLM response
 */
export function llmStream(
  config: LLMConfig,
  messages: LLMMessage[],
  metadata: StreamMetadata,
  options?: {
    maxTokens?: number;
    temperature?: number;
    onComplete?: (totalTokens: number, latencyMs: number) => Promise<void>;
  }
): Promise<Response> {
  const startTime = Date.now();

  const payload = {
    model: config.model,
    messages,
    ...buildTokenLimitField(config.model, options?.maxTokens ?? config.maxTokens),
    ...buildTemperatureField(config.model, options?.temperature ?? config.temperature),
    stream: true,
  };

  return new Promise<Response>((resolve, reject) => {
    (async () => {
    try {
      // W1.B.1 — Timeout até o primeiro byte (TTFB) para streaming.
      // Após o stream começar, deixamos correr — quem consome decide
      // quando cancelar.
      const ttfbController = new AbortController();
      const ttfbTimeout = setTimeout(() => ttfbController.abort(), 30_000);

      let response: Response;
      try {
        response = await fetch(config.apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: ttfbController.signal,
        });
      } finally {
        clearTimeout(ttfbTimeout);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`LLM API error: ${response.status}`) as Error & {
          status: number;
          body: string;
        };
        error.status = response.status;
        error.body = errorText;
        reject(error);
        return;
      }

      const encoder = new TextEncoder();
      const reader = response.body!.getReader();
      let totalTokens = 0;

      const stream = new ReadableStream({
        async start(controller) {
          // Send metadata event first
          const metadataEvent = `data: ${JSON.stringify({
            type: "metadata",
            agentName: metadata.agentName,
            agentSlug: metadata.agentSlug,
          })}\n\n`;
          controller.enqueue(encoder.encode(metadataEvent));
        },
        async pull(controller) {
          const { done, value } = await reader.read();

          if (done) {
            const latencyMs = Date.now() - startTime;

            // Callback for logging
            if (options?.onComplete) {
              await options.onComplete(totalTokens, latencyMs);
            }

            // Send final metadata
            const finalEvent = `data: ${JSON.stringify({
              type: "metadata",
              agentName: metadata.agentName,
              agentSlug: metadata.agentSlug,
              latencyMs,
              tokensUsed: totalTokens,
            })}\n\n`;
            controller.enqueue(encoder.encode(finalEvent));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // Pass through the chunk
          controller.enqueue(value);

          // Extract usage info
          try {
            const text = new TextDecoder().decode(value);
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                const jsonStr = line.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.usage?.total_tokens) {
                    totalTokens = parsed.usage.total_tokens;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          } catch {
            // Ignore
          }
        },
        cancel() {
          reader.cancel();
        },
      });

      resolve(
        new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      );
    } catch (error) {
      reject(error);
    }
    })();
  });
}

/**
 * Map LLM error status to user-friendly response
 * 
 * Covers all common HTTP error codes from AI providers:
 * - 400: Bad request (malformed input)
 * - 401: Authentication failed (invalid API key)
 * - 402: Payment required (credits depleted)
 * - 403: Forbidden (model access denied)
 * - 404: Model not found
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 * - 502: Bad gateway
 * - 503: Service unavailable
 */
export function mapLLMError(
  status: number,
  requestId: string
): { message: string; code: string; httpStatus: number } {
  switch (status) {
    case 400:
      return { message: "Invalid AI request", code: "AI_BAD_REQUEST", httpStatus: 400 };
    case 401:
      return { message: "AI authentication failed", code: "AI_AUTH_ERROR", httpStatus: 500 };
    case 402:
      return { message: "AI credits depleted", code: "NO_CREDITS", httpStatus: 402 };
    case 403:
      return { message: "AI model access denied", code: "AI_FORBIDDEN", httpStatus: 403 };
    case 404:
      return { message: "AI model not found", code: "AI_MODEL_NOT_FOUND", httpStatus: 404 };
    case 429:
      return { message: "Rate limit exceeded", code: "RATE_LIMIT", httpStatus: 429 };
    case 500:
      return { message: "AI internal error", code: "AI_INTERNAL_ERROR", httpStatus: 502 };
    case 502:
      return { message: "AI gateway error", code: "AI_GATEWAY_ERROR", httpStatus: 502 };
    case 503:
      return { message: "AI service unavailable", code: "AI_UNAVAILABLE", httpStatus: 503 };
    default:
      return { message: "AI API error", code: "AI_API_ERROR", httpStatus: 502 };
  }
}
