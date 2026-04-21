/**
 * weekly-curate-opening — Curadoria IA da Abertura Executiva da Weekly v2
 *
 * Invoca o agente `curador-orquestrador` via Lovable AI Gateway com os
 * insumos agregados dos Pré-Weekly da BU na semana corrente. Devolve o
 * rascunho estruturado (resumo, blocos, ordem sugerida, cobertura) que
 * o front-end mapeia para `WeeklyExecutiveOpening`.
 *
 * Stack canônico:
 *  - withMiddleware (auth + BU access validation)
 *  - loadAgent + buildSystemPrompt + resolveLLMConfig + llmComplete
 *  - extractJsonPayload (fences, prefixos, sufixos)
 *  - Log obrigatório em ai_agent_logs (multi-llm-gateway-standard-v2)
 *
 * Fallback: se o agente estiver desativado, sem LLM config ou erro de gateway,
 * devolve `origin='manual'` com payload vazio (front-end edita manualmente).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { loadAgent, buildSystemPrompt } from "../_shared/agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// TYPES
// ============================================================================

interface WeeklyAggregatedTopic {
  teamName: string;
  title: string;
  category: string;
  urgency?: string;
  rationale?: string;
}

interface WeeklyAggregatedPeopleSignal {
  teamName: string;
  type: string;
  description: string;
}

interface CuratePayload {
  bu_id: string;
  buName: string;
  referenceWeek: string;
  topics: WeeklyAggregatedTopic[];
  peopleSignals: WeeklyAggregatedPeopleSignal[];
  coverage: {
    totalLeaders: number;
    submittedLeaders: number;
    pendingLeaders: number;
  };
}

interface CuratorOutput {
  executiveSummary?: string;
  blocks?: {
    performance?: Array<Record<string, unknown>>;
    projects?: Array<Record<string, unknown>>;
    people?: Array<Record<string, unknown>>;
  };
  suggestedOrder?: string[];
  outOfAgenda?: string[];
  coverage?: {
    rate?: number;
    level?: "full" | "partial" | "critical";
  };
}

// ============================================================================
// JSON Extractor (mirror leve do helper canônico do front)
// ============================================================================

function extractJsonPayload(raw: string): unknown {
  if (!raw) return null;
  let s = raw.trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fenced && fenced[1]) s = fenced[1].trim();
  const firstBrace = s.search(/[{[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace > 0) s = s.slice(0, lastBrace + 1);
  s = s.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ============================================================================
// LOG to ai_agent_logs (canônico)
// ============================================================================

async function logAgentInvocation(
  serviceClient: any,
  params: {
    agentSlug: string;
    agentName: string;
    integrationKey: string;
    model: string;
    buId: string;
    userId: string | null;
    status: "success" | "error";
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    errorMessage?: string;
  },
): Promise<void> {
  try {
    await serviceClient.from("ai_agent_logs").insert({
      agent_name: params.agentName,
      integration_key: params.integrationKey,
      model_used: params.model,
      scope: "global",
      bu_id: params.buId,
      user_id: params.userId,
      status: params.status,
      latency_ms: params.latencyMs,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      total_tokens: params.totalTokens ?? null,
      action_context: "weekly-curate-opening",
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[weekly-curate-opening] Failed to write ai_agent_logs:", err);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-current-bu-id",
      },
    });
  }

  const middleware = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
  });

  if (!middleware.success || !middleware.context) {
    return middleware.error!;
  }

  const ctx: RequestContext = middleware.context;
  const { requestId, serviceClient, buId, user } = ctx;

  try {
    const body = (await req.json()) as Partial<CuratePayload>;

    // Validação de input
    if (!body.referenceWeek || typeof body.referenceWeek !== "string") {
      return errorResponse("referenceWeek is required", 400, {
        requestId,
        error: "INVALID_INPUT",
      });
    }

    const payload: CuratePayload = {
      bu_id: buId!,
      buName: body.buName || "Empresa",
      referenceWeek: body.referenceWeek,
      topics: Array.isArray(body.topics) ? body.topics : [],
      peopleSignals: Array.isArray(body.peopleSignals) ? body.peopleSignals : [],
      coverage: body.coverage || {
        totalLeaders: 0,
        submittedLeaders: 0,
        pendingLeaders: 0,
      },
    };

    // 1) Carregar agente (com cache + checagem de ativação BU)
    const loaded = await loadAgent(
      serviceClient,
      "curador-orquestrador",
      buId!,
      requestId,
    );

    if (!loaded || !loaded.isEnabledInBu) {
      console.warn(
        `[${requestId}] curador-orquestrador not available — returning manual fallback`,
      );
      logRequestCompletion(ctx, "success", "manual-fallback");
      return successResponse({
        origin: "manual",
        reason: !loaded ? "AGENT_NOT_FOUND" : "AGENT_DISABLED_FOR_BU",
        output: null,
      });
    }

    // 2) Resolver LLM config (multi-provider: Google direto / Gateway)
    const llmConfig = await resolveLLMConfig(
      serviceClient,
      loaded.agent.model_name,
    );
    if (!llmConfig) {
      console.warn(`[${requestId}] No LLM config — returning manual fallback`);
      logRequestCompletion(ctx, "success", "no-llm-config");
      return successResponse({
        origin: "manual",
        reason: "NO_LLM_CONFIG",
        output: null,
      });
    }

    // 3) Montar prompts
    const systemPrompt = await buildSystemPrompt(
      serviceClient,
      loaded.agent,
      loaded.effectiveSystemPrompt,
      buId!,
      requestId,
    );

    const userPrompt = `Contexto: curadoria de Abertura Executiva da Weekly da BU "${payload.buName}".
Semana de referência (segunda-feira): ${payload.referenceWeek}.

Cobertura dos Pré-Weekly recebidos:
- Líderes esperados: ${payload.coverage.totalLeaders}
- Líderes que enviaram: ${payload.coverage.submittedLeaders}
- Pendentes: ${payload.coverage.pendingLeaders}

Insumos consolidados (tópicos cross-times):
${JSON.stringify(payload.topics, null, 2)}

Sinais estruturais de pessoas:
${JSON.stringify(payload.peopleSignals, null, 2)}

TAREFA:
Sintetize uma Abertura Executiva agrupada em 3 blocos (performance, projects, people),
identifique padrões cross-times, defina urgência herdada do líder originador,
sugira ordem ótima de discussão (40-60 min totais) e classifique cobertura
("full" >=80%, "partial" 50-79%, "critical" <50%).

FORMATO DE SAÍDA (JSON aderente ao output_schema do agente):
{
  "executiveSummary": "3 parágrafos curtos, sem markdown",
  "blocks": {
    "performance": [{ "title": "...", "summary": "...", "urgency": "alta|media|baixa", "leaders": ["..."] }],
    "projects": [{ ... }],
    "people": [{ ... }]
  },
  "suggestedOrder": ["título1", "título2", ...],
  "outOfAgenda": ["item operacional 1", "..."],
  "coverage": { "rate": 0.0-1.0, "level": "full|partial|critical" }
}

Retorne APENAS o JSON, sem comentários adicionais.`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // 4) Chamar LLM
    const startedAt = Date.now();
    let llmResponse;
    try {
      llmResponse = await llmComplete(llmConfig, messages, {
        maxTokens: loaded.agent.max_tokens || 2000,
        temperature: loaded.agent.temperature ?? 0.3,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startedAt;
      const errorMessage = err?.message || "LLM_ERROR";
      console.error(`[${requestId}] LLM error:`, errorMessage, err?.body);

      await logAgentInvocation(serviceClient, {
        agentSlug: "curador-orquestrador",
        agentName: loaded.agent.name,
        integrationKey: loaded.agent.integration_key,
        model: llmConfig.model,
        buId: buId!,
        userId: user?.id ?? null,
        status: "error",
        latencyMs,
        errorMessage,
      });

      // Surface 429/402 to client; everything else cai em fallback manual
      if (err?.status === 429) {
        return errorResponse(
          "Limite de requisições atingido. Tente novamente em alguns minutos.",
          429,
          { requestId, error: "RATE_LIMITED" },
        );
      }
      if (err?.status === 402) {
        return errorResponse(
          "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage.",
          402,
          { requestId, error: "PAYMENT_REQUIRED" },
        );
      }

      logRequestCompletion(ctx, "error", `LLM_ERROR: ${errorMessage}`);
      return successResponse({
        origin: "manual",
        reason: "LLM_ERROR",
        output: null,
      });
    }

    const latencyMs = Date.now() - startedAt;
    const rawContent = llmResponse.content || "";
    const parsed = extractJsonPayload(rawContent) as CuratorOutput | null;

    // 5) Log success
    await logAgentInvocation(serviceClient, {
      agentSlug: "curador-orquestrador",
      agentName: loaded.agent.name,
      integrationKey: loaded.agent.integration_key,
      model: llmConfig.model,
      buId: buId!,
      userId: user?.id ?? null,
      status: parsed ? "success" : "error",
      latencyMs,
      inputTokens: llmResponse.usage?.promptTokens,
      outputTokens: llmResponse.usage?.completionTokens,
      totalTokens: llmResponse.usage?.totalTokens,
      errorMessage: parsed ? undefined : "JSON_PARSE_FAILED",
    });

    if (!parsed) {
      console.warn(`[${requestId}] Failed to parse LLM JSON response`);
      logRequestCompletion(ctx, "success", "parse-failed-fallback");
      return successResponse({
        origin: "manual",
        reason: "JSON_PARSE_FAILED",
        output: null,
        rawContent,
      });
    }

    logRequestCompletion(ctx, "success", `latency=${latencyMs}ms`);
    return successResponse({
      origin: "ai-curated",
      generatedAt: new Date().toISOString(),
      output: parsed,
    });
  } catch (err: any) {
    console.error(`[${requestId}] Unexpected error:`, err);
    logRequestCompletion(ctx, "error", err?.message);
    return errorResponse(err?.message || "Internal error", 500, {
      requestId,
      error: "INTERNAL_ERROR",
    });
  }
});
