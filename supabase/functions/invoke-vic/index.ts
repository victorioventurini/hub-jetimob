/**
 * invoke-vic - AI Agent Orchestrator
 * 
 * Refactored to use modular components:
 * - llm-client.ts: LLM API interactions
 * - agent-loader.ts: Agent configuration loading
 * - hub-tools.ts: Tool execution
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  logRequestCompletion,
  checkRateLimits,
  createServiceClient,
  withMiddleware,
  type RequestContext,
} from "../_shared/middleware.ts";
import {
  HUB_TOOL_DEFINITIONS,
  executeHubTool,
} from "../_shared/hub-tools.ts";
import {
  resolveLLMConfig,
  llmComplete,
  llmStream,
  mapLLMError,
  type LLMMessage,
  type ToolCall,
} from "../_shared/llm-client.ts";
import {
  loadAgent,
  buildSystemPrompt,
  buildUserPrompt,
  getAgentTools,
  type AgentContext,
} from "../_shared/agent-loader.ts";
import {
  InvokeVicRequestSchema,
  type InvokeVicRequest,
  parseRequestBody,
  formatValidationErrors,
  validateToolCallArgs,
} from "../_shared/validation.ts";

const MAX_CULTURE_MESSAGE_CHARS = 60;

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

function normalizeCultureMessage(input: string): string {
  return stripWrappingQuotes(normalizeSingleLineText(input));
}

/**
 * Log agent invocation to ai_agent_logs
 */
async function logAgentInvocation(
  serviceClient: any,
  params: {
    agentId: string | null;
    agentName: string;
    scope: string;
    buId: string;
    userId: string;
    integrationKey: string;
    actionContext: string;
    status: "success" | "error";
    modelUsed?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    errorMessage?: string;
    latencyMs: number;
  }
) {
  await serviceClient.from("ai_agent_logs").insert({
    agent_id: params.agentId,
    agent_name: params.agentName,
    scope: params.scope,
    bu_id: params.buId,
    user_id: params.userId,
    integration_key: params.integrationKey,
    action_context: params.actionContext,
    status: params.status,
    model_used: params.modelUsed,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.totalTokens,
    error_message: params.errorMessage,
    latency_ms: params.latencyMs,
  });
}

/**
 * Handle tool calls from the LLM
 */
async function handleToolCalls(
  serviceClient: any,
  toolCalls: ToolCall[],
  buId: string,
  requestId: string
): Promise<{ role: string; tool_call_id: string; content: string }[]> {
  const toolResults: { role: string; tool_call_id: string; content: string }[] = [];

  for (const toolCall of toolCalls) {
    // Safely parse tool arguments with validation
    const args = validateToolCallArgs(toolCall.function.arguments);
    
    if (args === null) {
      console.error(`[${requestId}] Tool ${toolCall.function.name} has invalid arguments`);
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Erro: argumentos inválidos para ${toolCall.function.name}`,
      });
      continue;
    }

    try {
      const result = await executeHubTool(serviceClient, toolCall.function.name, args, buId);

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });

      console.log(`[${requestId}] Tool ${toolCall.function.name} executed successfully`);
    } catch (toolError) {
      console.error(`[${requestId}] Tool ${toolCall.function.name} failed:`, toolError);
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Erro ao executar ${toolCall.function.name}: ${toolError instanceof Error ? toolError.message : "Unknown error"}`,
      });
    }
  }

  return toolResults;
}

serve(async (req) => {
  // NOTE: verify_jwt is disabled for this function in config.toml.
  // We validate JWT (signing keys) + BU access + correlation-id via middleware.
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });

  if (!mw.success) {
    return mw.error!;
  }

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const startTime = ctx.startTime;
  const userId = ctx.user!.id;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;

  let agentId: string | null = null;
  let agentName = "unknown";

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate request body with Zod schema
    const parseResult = await parseRequestBody(req, InvokeVicRequestSchema);
    
    if (!parseResult.success) {
      const errorMsg = formatValidationErrors(parseResult.error);
      console.error(`[${requestId}] Validation error:`, errorMsg);
      return errorResponse(`Invalid request: ${errorMsg}`, 400, {
        requestId,
        error: "VALIDATION_ERROR",
      });
    }

    const body = parseResult.data;
    const { agentSlug, actionContext, context: aiContext, userQuestion, stream = false } = body;

    console.log(`[${requestId}] Invoke VIC: agent=${agentSlug}, user=${userId}, bu=${buId}, stream=${stream}`);

    // Rate limits (BU-scoped)
    const rateLimitError = await checkRateLimits(serviceClient, userId, buId, {}, requestId);
    if (rateLimitError) return rateLimitError;

    // =========================================================================
    // LOAD AGENT
    // =========================================================================
    const loadedAgent = await loadAgent(serviceClient, agentSlug, buId, requestId);
    
    if (!loadedAgent) {
      return errorResponse("Agent not found", 404, { requestId, error: "AGENT_NOT_FOUND" });
    }

    const { agent, effectiveSystemPrompt, isEnabledInBu } = loadedAgent;
    agentId = agent.id;
    agentName = agent.name;

    if (!isEnabledInBu) {
      return errorResponse("Agent is disabled for this BU", 403, {
        requestId,
        error: "AGENT_DISABLED",
        code: "AGENT_DISABLED",
      });
    }

    // =========================================================================
    // RESOLVE LLM CONFIG
    // =========================================================================
    const llmConfig = await resolveLLMConfig(serviceClient, agent.model_name);
    
    if (!llmConfig) {
      console.error(`[${requestId}] No AI API key configured (ChatGPT integration or LOVABLE_API_KEY fallback)`);
      return errorResponse("AI service not configured", 500, { requestId, error: "AI_NOT_CONFIGURED" });
    }

    // Override with agent settings
    llmConfig.maxTokens = agent.max_tokens || llmConfig.maxTokens;
    llmConfig.temperature = agent.temperature ?? llmConfig.temperature;

    // =========================================================================
    // BUILD PROMPTS
    // =========================================================================
    const systemPrompt = await buildSystemPrompt(
      serviceClient,
      agent,
      effectiveSystemPrompt,
      buId,
      requestId
    );
    const userPrompt = buildUserPrompt(aiContext, userQuestion);

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    console.log(`[${requestId}] Invoking agent: ${agentName} (${agentSlug}) for context: ${actionContext}`);

    // =========================================================================
    // PREPARE TOOLS
    // =========================================================================
    const allowedTools = getAgentTools(agent);
    let agentTools: typeof HUB_TOOL_DEFINITIONS | undefined;

    if (allowedTools?.length) {
      const hubToolNames = HUB_TOOL_DEFINITIONS.map((t) => t.function.name);
      const filteredToolNames = allowedTools.filter((t) => hubToolNames.includes(t));

      if (filteredToolNames.length > 0) {
        agentTools = HUB_TOOL_DEFINITIONS.filter((t) =>
          filteredToolNames.includes(t.function.name)
        );
        console.log(`[${requestId}] Agent has ${filteredToolNames.length} tools enabled: ${filteredToolNames.join(", ")}`);
      }
    }

    // =========================================================================
    // STREAMING MODE (only when no tools)
    // =========================================================================
    if (stream && !agentTools?.length) {
      try {
        return await llmStream(llmConfig, messages, { agentName, agentSlug }, {
          maxTokens: llmConfig.maxTokens,
          temperature: llmConfig.temperature,
          onComplete: async (totalTokens, latencyMs) => {
            await logAgentInvocation(serviceClient, {
              agentId,
              agentName,
              scope: agent.scope,
              buId,
              userId,
              integrationKey: agent.integration_key,
              actionContext,
              status: "success",
              modelUsed: llmConfig.model,
              totalTokens,
              latencyMs,
            });
            console.log(`[${requestId}] Stream completed in ${latencyMs}ms`);
            logRequestCompletion(ctx, "success");
          },
        });
      } catch (error: any) {
        const errorInfo = mapLLMError(error.status || 500, requestId);
        
        await logAgentInvocation(serviceClient, {
          agentId,
          agentName,
          scope: agent.scope,
          buId,
          userId,
          integrationKey: agent.integration_key,
          actionContext,
          status: "error",
          errorMessage: `AI API error: ${error.status}`,
          latencyMs: Date.now() - startTime,
        });

        return errorResponse(errorInfo.message, errorInfo.httpStatus, {
          requestId,
          error: errorInfo.code,
          code: errorInfo.code,
        });
      }
    }

    // =========================================================================
    // NON-STREAMING MODE (with tool support)
    // =========================================================================
    let response;
    try {
      response = await llmComplete(llmConfig, messages, {
        maxTokens: llmConfig.maxTokens,
        temperature: llmConfig.temperature,
        tools: agentTools,
      });
    } catch (error: any) {
      console.error(`[${requestId}] AI API error:`, error.status, error.body);

      await logAgentInvocation(serviceClient, {
        agentId,
        agentName,
        scope: agent.scope,
        buId,
        userId,
        integrationKey: agent.integration_key,
        actionContext,
        status: "error",
        errorMessage: `AI API error: ${error.status}`,
        latencyMs: Date.now() - startTime,
      });

      const errorInfo = mapLLMError(error.status || 500, requestId);
      return errorResponse(errorInfo.message, errorInfo.httpStatus, {
        requestId,
        error: errorInfo.code,
        code: errorInfo.code,
      });
    }

    let content = response.content;
    let usage = response.usage;

    // Handle tool calls
    if (response.toolCalls?.length) {
      console.log(`[${requestId}] Processing ${response.toolCalls.length} tool calls`);

      const toolResults = await handleToolCalls(
        serviceClient,
        response.toolCalls,
        buId,
        requestId
      );

      // Second LLM call with tool results
      const secondMessages: LLMMessage[] = [
        ...messages,
        response.rawMessage as LLMMessage,
        ...toolResults.map((r) => ({
          role: "tool" as const,
          content: r.content,
          tool_call_id: r.tool_call_id,
        })),
      ];

      try {
        const secondResponse = await llmComplete(llmConfig, secondMessages, {
          maxTokens: llmConfig.maxTokens,
          temperature: llmConfig.temperature,
        });

        content = secondResponse.content || content;

        if (secondResponse.usage && usage) {
          usage = {
            promptTokens: usage.promptTokens + secondResponse.usage.promptTokens,
            completionTokens: usage.completionTokens + secondResponse.usage.completionTokens,
            totalTokens: usage.totalTokens + secondResponse.usage.totalTokens,
          };
        }
      } catch (secondError) {
        console.error(`[${requestId}] Second LLM call failed:`, secondError);
        // Continue with first response content
      }
    }

    // Enforce hard limits for specific short-form contexts
    if (aiContext?.type === "culture_message" && content) {
      let normalized = normalizeCultureMessage(content);

      if (normalized.length > MAX_CULTURE_MESSAGE_CHARS) {
        // One retry: ask the model to rewrite under the hard limit.
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
            { maxTokens: 120, temperature: 0.2 }
          );

          const retryContent = normalizeCultureMessage(retry.content || "");

          if (retryContent && retryContent.length <= MAX_CULTURE_MESSAGE_CHARS) {
            normalized = retryContent;

            if (retry.usage && usage) {
              usage = {
                promptTokens: usage.promptTokens + retry.usage.promptTokens,
                completionTokens: usage.completionTokens + retry.usage.completionTokens,
                totalTokens: usage.totalTokens + retry.usage.totalTokens,
              };
            }
          } else {
            // Still too long: return an error so the client can fallback without truncation.
            const latencyMs = Date.now() - startTime;
            await logAgentInvocation(serviceClient, {
              agentId,
              agentName,
              scope: agent.scope,
              buId,
              userId,
              integrationKey: agent.integration_key,
              actionContext,
              status: "error",
              modelUsed: llmConfig.model,
              inputTokens: usage?.promptTokens,
              outputTokens: usage?.completionTokens,
              totalTokens: usage?.totalTokens,
              errorMessage: "AI_OUTPUT_TOO_LONG",
              latencyMs,
            });
            logRequestCompletion(ctx, "error", "AI_OUTPUT_TOO_LONG");
            return errorResponse("AI output too long", 502, {
              requestId,
              error: "AI_OUTPUT_TOO_LONG",
              code: "AI_OUTPUT_TOO_LONG",
            });
          }
        } catch (retryError) {
          console.warn(`[${requestId}] Culture message rewrite retry failed:`, retryError);
          // If retry fails, keep original content; client-side will still reject >60.
        }
      }

      content = normalized;
    }

    if (!content) {
      return errorResponse("Empty response from AI", 502, { requestId, error: "EMPTY_AI_RESPONSE" });
    }

    const latencyMs = Date.now() - startTime;

    await logAgentInvocation(serviceClient, {
      agentId,
      agentName,
      scope: agent.scope,
      buId,
      userId,
      integrationKey: agent.integration_key,
      actionContext,
      status: "success",
      modelUsed: llmConfig.model,
      inputTokens: usage?.promptTokens,
      outputTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
      latencyMs,
    });

    console.log(`[${requestId}] Agent ${agentName} responded successfully in ${latencyMs}ms`);
    logRequestCompletion(ctx, "success");

    return jsonResponse({
      response: content,
      agentName,
      agentSlug,
      tokensUsed: usage?.totalTokens,
      latencyMs,
    });
  } catch (error) {
    console.error(`[${requestId}] Error in invoke-vic function:`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      // Best-effort log
      const serviceClientFallback = createServiceClient();
      await logAgentInvocation(serviceClientFallback, {
        agentId,
        agentName,
        scope: "global",
        buId: buId || "",
        userId: userId || "",
        integrationKey: "invoke-vic",
        actionContext: "error",
        status: "error",
        errorMessage,
        latencyMs: Date.now() - startTime,
      });
    } catch (logError) {
      console.error(`[${requestId}] Failed to log error:`, logError);
    }

    logRequestCompletion(ctx, "error", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
