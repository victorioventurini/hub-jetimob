/**
 * invoke-vic - AI Agent Orchestrator
 *
 * Modular structure:
 * - logger.ts: ai_agent_logs writes
 * - tool-handler.ts: tool-call execution
 * - culture-message.ts: short-form output enforcement
 * - _shared/llm-client.ts, _shared/agent-loader.ts, _shared/hub-tools.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimits,
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  logRequestCompletion,
  type RequestContext,
  withMiddleware,
} from "../_shared/middleware.ts";
import { HUB_TOOL_DEFINITIONS } from "../_shared/hub-tools.ts";
import {
  llmComplete,
  llmStream,
  type LLMMessage,
  mapLLMError,
  resolveLLMConfig,
} from "../_shared/llm-client.ts";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getAgentTools,
  loadAgent,
} from "../_shared/agent-loader.ts";
import {
  formatValidationErrors,
  InvokeVicRequestSchema,
  parseRequestBody,
} from "../_shared/validation.ts";
import type { HttpLikeError } from "../_shared/types/common.ts";
import { logAgentInvocation } from "./logger.ts";
import { handleToolCalls } from "./tool-handler.ts";
import { enforceCultureMessageLimit } from "./culture-message.ts";

serve(async (req) => {
  // verify_jwt is disabled in config.toml; we validate JWT, BU and correlation-id via middleware.
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });

  if (!mw.success) return mw.error!;

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
    const {
      agentSlug,
      actionContext,
      context: aiContext,
      userQuestion,
      stream = false,
    } = body;

    console.log(
      `[${requestId}] Invoke VIC: agent=${agentSlug}, user=${userId}, bu=${buId}, stream=${stream}`,
    );

    const rateLimitError = await checkRateLimits(
      serviceClient,
      userId,
      buId,
      {},
      requestId,
    );
    if (rateLimitError) return rateLimitError;

    // ---- Load agent ----
    const loadedAgent = await loadAgent(serviceClient, agentSlug, buId, requestId);
    if (!loadedAgent) {
      return errorResponse("Agent not found", 404, {
        requestId,
        error: "AGENT_NOT_FOUND",
      });
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

    // ---- Resolve LLM config ----
    const llmConfig = await resolveLLMConfig(serviceClient, agent.model_name);
    if (!llmConfig) {
      console.error(
        `[${requestId}] No AI API key configured (ChatGPT integration or LOVABLE_API_KEY fallback)`,
      );
      return errorResponse("AI service not configured", 500, {
        requestId,
        error: "AI_NOT_CONFIGURED",
      });
    }

    llmConfig.maxTokens = agent.max_tokens || llmConfig.maxTokens;
    llmConfig.temperature = agent.temperature ?? llmConfig.temperature;

    // ---- Build prompts ----
    const systemPrompt = await buildSystemPrompt(
      serviceClient,
      agent,
      effectiveSystemPrompt,
      buId,
      requestId,
    );
    const userPrompt = buildUserPrompt(aiContext, userQuestion);

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    console.log(
      `[${requestId}] Invoking agent: ${agentName} (${agentSlug}) for context: ${actionContext}`,
    );

    // ---- Resolve allowed tools ----
    const allowedTools = getAgentTools(agent);
    let agentTools: typeof HUB_TOOL_DEFINITIONS | undefined;

    if (allowedTools?.length) {
      const hubToolNames = HUB_TOOL_DEFINITIONS.map((t) => t.function.name);
      const filteredToolNames = allowedTools.filter((t) =>
        hubToolNames.includes(t)
      );

      if (filteredToolNames.length > 0) {
        agentTools = HUB_TOOL_DEFINITIONS.filter((t) =>
          filteredToolNames.includes(t.function.name)
        );
        console.log(
          `[${requestId}] Agent has ${filteredToolNames.length} tools enabled: ${filteredToolNames.join(", ")}`,
        );
      }
    }

    // ---- Streaming mode (no tools) ----
    if (stream && !agentTools?.length) {
      try {
        return await llmStream(
          llmConfig,
          messages,
          { agentName, agentSlug },
          {
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
          },
        );
      } catch (error) {
        const httpErr = error as HttpLikeError;
        const errorInfo = mapLLMError(httpErr.status || 500, requestId);

        await logAgentInvocation(serviceClient, {
          agentId,
          agentName,
          scope: agent.scope,
          buId,
          userId,
          integrationKey: agent.integration_key,
          actionContext,
          status: "error",
          errorMessage: `AI API error: ${httpErr.status}`,
          latencyMs: Date.now() - startTime,
        });

        return errorResponse(errorInfo.message, errorInfo.httpStatus, {
          requestId,
          error: errorInfo.code,
          code: errorInfo.code,
        });
      }
    }

    // ---- Non-streaming mode (tool support) ----
    let response;
    try {
      response = await llmComplete(llmConfig, messages, {
        maxTokens: llmConfig.maxTokens,
        temperature: llmConfig.temperature,
        tools: agentTools,
      });
    } catch (error) {
      const httpErr = error as HttpLikeError;
      console.error(`[${requestId}] AI API error:`, httpErr.status, httpErr.body);

      await logAgentInvocation(serviceClient, {
        agentId,
        agentName,
        scope: agent.scope,
        buId,
        userId,
        integrationKey: agent.integration_key,
        actionContext,
        status: "error",
        errorMessage: `AI API error: ${httpErr.status}`,
        latencyMs: Date.now() - startTime,
      });

      const errorInfo = mapLLMError(httpErr.status || 500, requestId);
      return errorResponse(errorInfo.message, errorInfo.httpStatus, {
        requestId,
        error: errorInfo.code,
        code: errorInfo.code,
      });
    }

    let content = response.content;
    let usage = response.usage;

    if (response.toolCalls?.length) {
      console.log(
        `[${requestId}] Processing ${response.toolCalls.length} tool calls`,
      );

      const toolResults = await handleToolCalls(
        serviceClient,
        response.toolCalls,
        buId,
        requestId,
      );

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
            completionTokens:
              usage.completionTokens + secondResponse.usage.completionTokens,
            totalTokens: usage.totalTokens + secondResponse.usage.totalTokens,
          };
        }
      } catch (secondError) {
        console.error(`[${requestId}] Second LLM call failed:`, secondError);
      }
    }

    // ---- Enforce hard char limit for culture_message ----
    if (aiContext?.type === "culture_message" && content) {
      const result = await enforceCultureMessageLimit(
        llmConfig,
        systemPrompt,
        content,
        usage,
        requestId,
      );
      usage = result.usage;
      content = result.content;

      if (!result.ok && result.reason === "too_long") {
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
    }

    if (!content) {
      return errorResponse("Empty response from AI", 502, {
        requestId,
        error: "EMPTY_AI_RESPONSE",
      });
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

    console.log(
      `[${requestId}] Agent ${agentName} responded successfully in ${latencyMs}ms`,
    );
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
