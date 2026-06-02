/**
 * mbr-pre-month-analysis — Análise mensal IA da Abertura do Pré-MBR
 *
 * Recebe o panorama do mês de UM time (KRs, KPIs com delta vs mês anterior,
 * projetos atrasados, decisões abertas) e devolve uma narrativa estruturada
 * via agente `analista-estrategico` (reuso — não criar agente por rito).
 *
 * Output:
 *   {
 *     summary: string,                 // 3-5 linhas executivas
 *     highlights: Array<{ title, detail }>,
 *     offenders:  Array<{ title, detail }>,
 *     risks:      Array<{ title, detail }>,
 *     recommendations: string[],
 *   }
 *
 * Stack canônico: withMiddleware + loadAgent + llmCompleteWithFallback + ai_agent_logs.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { loadAgent, buildSystemPrompt } from "../_shared/agent-loader.ts";
import { llmCompleteWithFallback, type LLMMessage } from "../_shared/llm-client.ts";
import type { EdgeSupabaseClient, HttpLikeError } from "../_shared/types/common.ts";

// ============================================================================
// TYPES
// ============================================================================

interface KrInput {
  title: string;
  state: string;
  finalProgress: number;
  paceStatus: string;
  deltaProgress?: number | null;
}

interface KpiInput {
  name: string;
  unit?: string;
  currentValue: number | null;
  previousValue: number | null;
  target: number | null;
  ragStatus: string;
  /** Direção da meta: 'up' = maior é melhor; 'down' = menor é melhor. */
  direction?: 'up' | 'down' | 'maintain' | null;
  /** Delta percentual bruto (current vs previous). */
  deltaPct?: number | null;
  /** Delta orientado pela direção: positivo = bom, negativo = ruim. */
  orientedDeltaPct?: number | null;
}

interface ProjectInput {
  name: string;
  reason: string; // "projeto atrasado" | "milestone atrasado: <name>"
}

interface AnalysisPayload {
  teamName: string;
  referenceMonth: string; // YYYY-MM
  previousMonth?: string;
  krs: KrInput[];
  kpis: KpiInput[];
  overdueProjects: ProjectInput[];
  totals: {
    krsTotal: number;
    krsAttention: number;
    kpisTotal: number;
    kpisAttention: number;
    projectsTotal: number;
    projectsAttention: number;
  };
}

interface AnalysisOutput {
  summary?: string;
  highlights?: Array<{ title: string; detail: string }>;
  offenders?: Array<{ title: string; detail: string }>;
  risks?: Array<{ title: string; detail: string }>;
  recommendations?: string[];
}

// ============================================================================
// JSON Extractor
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
// LOG to ai_agent_logs
// ============================================================================

async function logAgentInvocation(
  serviceClient: EdgeSupabaseClient,
  params: {
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
      action_context: "mbr-pre-month-analysis",
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[mbr-pre-month-analysis] Failed to write ai_agent_logs:", err);
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
    const body = (await req.json()) as Partial<AnalysisPayload>;

    if (!body.teamName || !body.referenceMonth) {
      return errorResponse("teamName and referenceMonth are required", 400, {
        requestId,
        error: "INVALID_INPUT",
      });
    }

    const payload: AnalysisPayload = {
      teamName: body.teamName,
      referenceMonth: body.referenceMonth,
      previousMonth: body.previousMonth,
      krs: Array.isArray(body.krs) ? body.krs : [],
      kpis: Array.isArray(body.kpis) ? body.kpis : [],
      overdueProjects: Array.isArray(body.overdueProjects) ? body.overdueProjects : [],
      totals: body.totals || {
        krsTotal: 0, krsAttention: 0,
        kpisTotal: 0, kpisAttention: 0,
        projectsTotal: 0, projectsAttention: 0,
      },
    };

    // 1) Carregar agente analista-estrategico (reuso canônico)
    const loaded = await loadAgent(
      serviceClient,
      "analista-estrategico",
      buId!,
      requestId,
    );

    if (!loaded || !loaded.isEnabledInBu) {
      console.warn(`[${requestId}] analista-estrategico not available — manual fallback`);
      logRequestCompletion(ctx, "success", "manual-fallback");
      return successResponse({
        origin: "manual",
        reason: !loaded ? "AGENT_NOT_FOUND" : "AGENT_DISABLED_FOR_BU",
        output: null,
      });
    }

    // 2) Prompts
    const systemPrompt = await buildSystemPrompt(
      serviceClient,
      loaded.agent,
      loaded.effectiveSystemPrompt,
      buId!,
      requestId,
    );

    const userPrompt = `Você está preparando a abertura do Pré-MBR (revisão mensal) do time "${payload.teamName}".
Mês de referência: ${payload.referenceMonth}${payload.previousMonth ? ` (comparando com ${payload.previousMonth})` : ""}.

PANORAMA AGREGADO:
- KRs: ${payload.totals.krsAttention}/${payload.totals.krsTotal} em atenção
- KPIs: ${payload.totals.kpisAttention}/${payload.totals.kpisTotal} fora da meta
- Projetos/marcos atrasados: ${payload.totals.projectsAttention}/${payload.totals.projectsTotal}

KEY RESULTS (estado final do mês):
${JSON.stringify(payload.krs, null, 2)}

KPIs (com delta vs mês anterior, quando disponível). IMPORTANTE: cada KPI traz \`direction\` ('up' = maior é melhor; 'down' = menor é melhor). Sempre interprete avanço/piora pelo \`orientedDeltaPct\` (positivo = bom, negativo = ruim) — NUNCA pelo \`deltaPct\` bruto. Ex.: CAC com \`direction='down'\` que sobe é PIORA, mesmo com deltaPct positivo.
${JSON.stringify(payload.kpis, null, 2)}

PROJETOS/MARCOS ATRASADOS:
${JSON.stringify(payload.overdueProjects, null, 2)}

TAREFA:
Gere uma análise executiva do mês para o líder do time, com:
1. Resumo executivo (3-5 linhas, sem markdown, tom direto e construtivo).
2. Destaques (top 3 movimentos positivos do mês — KRs/KPIs que avançaram, marcos entregues).
3. Ofensores (top 3 movimentos negativos — KPIs em queda, KRs estagnados, atrasos relevantes).
4. Riscos (até 3 sinais de alerta para o próximo mês — não confundir com ofensores; foco em tendência).
5. Recomendações (2-4 ações concretas que o líder pode trazer ao MBR).

Seja específico: cite SEMPRE o campo "title" dos KRs e o campo "name" dos KPIs.
NUNCA cite IDs/UUIDs (strings com formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) — use o título humano.
Não invente entidades que não estão nos dados. Se não houver dados suficientes em alguma categoria, retorne array vazio.

FORMATO DE SAÍDA (JSON estrito, sem markdown):
{
  "summary": "string",
  "highlights": [{ "title": "...", "detail": "..." }],
  "offenders":  [{ "title": "...", "detail": "..." }],
  "risks":      [{ "title": "...", "detail": "..." }],
  "recommendations": ["...", "..."]
}

Retorne APENAS o JSON.`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // 3) Chamar LLM com fallback multi-modelo. Evita bloquear o Pré-MBR
    // quando o modelo configurado do agente estoura quota/rate-limit.
    const startedAt = Date.now();
    let llmResponse;
    try {
      llmResponse = await llmCompleteWithFallback(serviceClient, loaded.agent.model_name, messages, {
        maxTokens: loaded.agent.max_tokens || 2500,
        temperature: loaded.agent.temperature ?? 0.4,
        timeoutMs: 90_000,
        maxAttempts: 1,
      });
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const httpErr = err as HttpLikeError;
      const errorMessage = httpErr?.message || "LLM_ERROR";
      console.error(`[${requestId}] LLM error:`, errorMessage, httpErr?.body);

      await logAgentInvocation(serviceClient, {
        agentName: loaded.agent.name,
        integrationKey: loaded.agent.integration_key,
        model: loaded.agent.model_name || "fallback-chain",
        buId: buId!,
        userId: user?.id ?? null,
        status: "error",
        latencyMs,
        errorMessage,
      });

      if ((err as any)?.status === 402) {
        return errorResponse(
          "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage.",
          402,
          { requestId, error: "PAYMENT_REQUIRED" },
        );
      }

      logRequestCompletion(ctx, "success", `manual-fallback-after-llm-error: ${errorMessage}`);
      return successResponse({ origin: "manual", reason: "LLM_ERROR", output: null });
    }

    const latencyMs = Date.now() - startedAt;
    const rawContent = llmResponse.content || "";
    const parsed = extractJsonPayload(rawContent) as AnalysisOutput | null;

    await logAgentInvocation(serviceClient, {
      agentName: loaded.agent.name,
      integrationKey: loaded.agent.integration_key,
      model: llmResponse.modelUsed || loaded.agent.model_name || "fallback-chain",
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
      origin: "ai-generated",
      generatedAt: new Date().toISOString(),
      output: parsed,
    });
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    const message = err instanceof Error ? err.message : "Internal error";
    logRequestCompletion(ctx, "error", message);
    return errorResponse(message, 500, { requestId, error: "INTERNAL_ERROR" });
  }
});
