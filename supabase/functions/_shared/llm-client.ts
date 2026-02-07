/**
 * LLM Client - Unified interface for AI providers
 * Handles OpenAI and Lovable AI Gateway
 */

import { corsHeaders } from "./middleware.ts";

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
  serviceClient: any,
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
 * Resolve LLM configuration based on available providers
 */
export async function resolveLLMConfig(
  serviceClient: any,
  preferredModel: string | null
): Promise<LLMConfig | null> {
  const openAIApiKey = await getIntegrationApiKey(serviceClient, "chatgpt");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!openAIApiKey && !lovableApiKey) {
    return null;
  }

  const useOpenAI = !!openAIApiKey;

  return {
    apiUrl: useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: (useOpenAI ? openAIApiKey : lovableApiKey)!,
    model: useOpenAI
      ? preferredModel && preferredModel.startsWith("gpt")
        ? preferredModel
        : "gpt-4o-mini"
      : preferredModel || "google/gemini-2.5-flash",
    maxTokens: 800,
    temperature: 0.7,
  };
}

/**
 * Make a non-streaming LLM request
 */
export async function llmComplete(
  config: LLMConfig,
  messages: LLMMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    tools?: LLMTool[];
    toolChoice?: string | { type: string; function: { name: string } };
  }
): Promise<LLMResponse> {
  const payload: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
  };

  if (options?.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = options.toolChoice ?? "auto";
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`LLM API error: ${response.status}`) as Error & {
      status: number;
      body: string;
    };
    error.status = response.status;
    error.body = errorText;
    throw error;
  }

  const data = await response.json();

  return {
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
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();

    const payload = {
      model: config.model,
      messages,
      max_tokens: options?.maxTokens ?? config.maxTokens,
      temperature: options?.temperature ?? config.temperature,
      stream: true,
    };

    try {
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
