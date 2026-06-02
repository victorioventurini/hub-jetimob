/**
 * mbr-curate-opening — Curadoria IA da Abertura Executiva do MBR
 *
 * Materializa a decisão canônica do `docs/canonical/AI_AGENTS_PHILOSOPHY.md:71-72,300`:
 *   "`curador-orquestrador` invocado com insumos mensais → Abertura Executiva do MBR"
 *
 * Espelha 1:1 o padrão de `weekly-curate-opening`, trocando os insumos:
 *  - Semana → Mês de referência (YYYY-MM)
 *  - Tópicos cross-times pré-weekly → KPIs estratégicos + objetivos org + agregados pré-MBR
 *
 * Reutiliza o MESMO agente do Weekly (`curador-orquestrador`). Não cria
 * `curador-mbr` (proibido pela Filosofia de Agentes).
 *
 * Stack canônico (Edge Function Standard v4):
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
import type { EdgeSupabaseClient, HttpLikeError } from "../_shared/types/common.ts";

// ============================================================================
// TYPES
// ============================================================================

interface MbrCriticalKpi {
  kpiId: string;
  name: string;
  currentValue: number | null;
  target: number | null;
  ragStatus: string; // 'red' | 'yellow' | 'green' | 'no_data'
  variationVsLastMonth?: number | null;
  scope?: string; // 'org' | 'area'
  areaName?: string | null;
}

interface MbrOrgObjectiveBrief {
  objectiveId: string;
  title: string;
  progress: number;
  trend?: string;
  status?: string;
}

interface MbrPreAggregates {
  needsDecisionCount: number;
  crossDepCount: number;
  kpiJustifCount: number;
  kpiUpdatedCount: number;
  projectJustifCount: number;
  agendaSuggestionCount: number;
}

interface CuratePayload {
  bu_id: string;
  buName: string;
  referenceMonth: string; // YYYY-MM
  criticalKpis: MbrCriticalKpi[];
  orgObjectives: MbrOrgObjectiveBrief[];
  mbrPreAggregates: MbrPreAggregates;
  coverage: {
    totalTeams: number;
    submittedTeams: number;
    pendingTeams: number;
  };
  /**
   * Contexto de uso da curadoria. 'mbr' (default) gera linguagem para MBR
   * (executivos, decisões propostas). 'all-hands' gera resumo de comunicação
   * para a BU inteira, sem sugestões/recomendações ou referências ao MBR.
   */
  ritualContext?: "mbr" | "all-hands";
}

interface CuratorOutput {
  executiveSummary?: string;
  criticalKpiHighlights?: Array<{
    kpiId?: string;
    headline?: string;
    impact?: string;
  }>;
  alertsByBlock?: {
    performance?: string[];
    projetos?: string[];
    pessoas?: string[];
  };
  suggestedDecisions?: Array<{
    title?: string;
    category?: string;
  }>;
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
  serviceClient: EdgeSupabaseClient,
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
      action_context: "mbr-curate-opening",
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[mbr-curate-opening] Failed to write ai_agent_logs:", err);
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
    if (!body.referenceMonth || typeof body.referenceMonth !== "string") {
      return errorResponse("referenceMonth is required", 400, {
        requestId,
        error: "INVALID_INPUT",
      });
    }

    const payload: CuratePayload = {
      bu_id: buId!,
      buName: body.buName || "Empresa",
      referenceMonth: body.referenceMonth,
      criticalKpis: Array.isArray(body.criticalKpis) ? body.criticalKpis : [],
      orgObjectives: Array.isArray(body.orgObjectives) ? body.orgObjectives : [],
      mbrPreAggregates: body.mbrPreAggregates || {
        needsDecisionCount: 0,
        crossDepCount: 0,
        kpiJustifCount: 0,
        kpiUpdatedCount: 0,
        projectJustifCount: 0,
        agendaSuggestionCount: 0,
      },
      coverage: body.coverage || {
        totalTeams: 0,
        submittedTeams: 0,
        pendingTeams: 0,
      },
      ritualContext: body.ritualContext === "all-hands" ? "all-hands" : "mbr",
    };

    // Guard: se não há absolutamente nenhum insumo, não vale invocar IA.
    const hasAnyInput =
      payload.criticalKpis.length > 0 ||
      payload.orgObjectives.length > 0 ||
      payload.mbrPreAggregates.needsDecisionCount > 0 ||
      payload.mbrPreAggregates.crossDepCount > 0 ||
      payload.mbrPreAggregates.agendaSuggestionCount > 0;

    if (!hasAnyInput) {
      logRequestCompletion(ctx, "success", "insufficient-input");
      return successResponse({
        origin: "manual",
        reason: "INSUFFICIENT_INPUT",
        output: null,
      });
    }

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

    const isAllHands = payload.ritualContext === "all-hands";

    const ritualHeader = isAllHands
      ? `Contexto: curadoria do Resumo Executivo do All Hands mensal da BU "${payload.buName}", apresentado a TODA a BU (não apenas C-level). O conteúdo será lido em uma reunião de comunicação ampla.`
      : `Contexto: curadoria de Abertura Executiva do MBR (Monthly Business Review) da BU "${payload.buName}".`;

    const taskBlock = isAllHands
      ? `TAREFA:
Produza um Resumo Executivo do mês para comunicação ao All Hands (toda a BU).
Tom: claro, direto, acessível para todas as áreas. NÃO use jargão de executivo
nem o nome "MBR". NÃO escreva frases como "No MBR proponho...", "sugiro decidir...",
"próximos passos", "recomendações" ou qualquer chamada para decisão — o All Hands
é um rito de comunicação, não de decisão.
O campo "executiveSummary" deve conter SOMENTE análise descritiva do mês:
como performou em relação aos meses anteriores (tendência, variação de KPIs e
progresso dos OKRs) e em relação aos objetivos anuais da BU (quanto avançou vs.
meta do ano). Sem sugestões, sem recomendações, sem próximos passos.
Os campos "suggestedDecisions" e "alertsByBlock" devem vir como arrays vazios.`
      : `TAREFA:
Sintetize uma Abertura Executiva do MBR em estilo conciso (executivos C-level mensais).
O campo "executiveSummary" deve conter SOMENTE análise descritiva do mês de referência,
comparando-o com os meses anteriores (tendência, variação de KPIs e progresso dos OKRs)
e com os objetivos anuais da BU (quanto já foi avançado vs. meta do ano).
NÃO inclua no "executiveSummary" sugestões, recomendações, próximos passos, decisões
propostas ou chamadas para ação — sugestões devem ir APENAS no campo "suggestedDecisions".
Identifique padrões cross-times, ressalte os KPIs mais críticos com impacto estratégico,
agrupe alertas em 3 blocos (performance, projetos, pessoas) e proponha decisões a serem
tomadas durante o MBR. Classifique a cobertura ("full" >=80%, "partial" 50-79%, "critical" <50%).`;

    const summaryFieldHint = isAllHands
      ? `"executiveSummary": "2-3 parágrafos curtos, sem markdown, em tom de comunicação ampla (All Hands). SOMENTE ANÁLISE do mês ${payload.referenceMonth}: como performou vs. meses anteriores e quanto avançou nos objetivos anuais. Proibido: jargão 'MBR', sugestões, recomendações, decisões propostas, próximos passos, chamadas para ação."`
      : `"executiveSummary": "2-3 parágrafos curtos, sem markdown. SOMENTE ANÁLISE do mês de referência (${payload.referenceMonth}): como o mês performou em relação aos meses anteriores (tendência, variação) e em relação aos objetivos anuais da BU (avanço acumulado vs. meta do ano). NÃO inclua sugestões, recomendações, próximos passos, ações ou decisões propostas — apenas leitura analítica do que aconteceu e do quanto avançou no anual."`;

    const userPrompt = `${ritualHeader}
Mês de referência: ${payload.referenceMonth}.

Cobertura dos Pré-MBR recebidos:
- Times esperados: ${payload.coverage.totalTeams}
- Times que enviaram: ${payload.coverage.submittedTeams}
- Pendentes: ${payload.coverage.pendingTeams}

Agregados dos Pré-MBR (sinalizações dos líderes):
- Itens pedindo decisão coletiva: ${payload.mbrPreAggregates.needsDecisionCount}
- Dependências cross-team: ${payload.mbrPreAggregates.crossDepCount}
- Justificativas de KPIs fora da meta: ${payload.mbrPreAggregates.kpiJustifCount}
- KPIs atualizados durante o Pré-MBR: ${payload.mbrPreAggregates.kpiUpdatedCount}
- Justificativas de projetos/milestones atrasados: ${payload.mbrPreAggregates.projectJustifCount}
- Sugestões de pauta para o MBR: ${payload.mbrPreAggregates.agendaSuggestionCount}

KPIs estratégicos (escopo org/área) — incluir variação vs. mês anterior quando disponível:
${JSON.stringify(payload.criticalKpis, null, 2)}

OKRs organizacionais (progresso e tendência):
${JSON.stringify(payload.orgObjectives, null, 2)}

${taskBlock}

FORMATO DE SAÍDA (JSON estrito):
{
  ${summaryFieldHint},
  "criticalKpiHighlights": [
    { "kpiId": "uuid-ou-vazio", "headline": "...", "impact": "1-2 frases sobre impacto estratégico" }
  ],
  "alertsByBlock": {
    "performance": ${isAllHands ? "[]" : '["alerta 1", "alerta 2"]'},
    "projetos": ${isAllHands ? "[]" : '["alerta 1"]'},
    "pessoas": ${isAllHands ? "[]" : '["alerta 1"]'}
  },
  "suggestedDecisions": ${isAllHands ? "[]" : '[\n    { "title": "...", "category": "estrategica|operacional|pessoas|priorizacao" }\n  ]'},
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
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const httpErr = err as HttpLikeError;
      const errorMessage = httpErr?.message || "LLM_ERROR";
      console.error(`[${requestId}] LLM error:`, errorMessage, httpErr?.body);

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

      // Surface 429/402/503 ao client; demais erros caem em fallback manual
      if (httpErr?.status === 429) {
        return errorResponse(
          "Limite de requisições atingido. Tente novamente em alguns minutos.",
          429,
          { requestId, error: "RATE_LIMITED" },
        );
      }
      if (httpErr?.status === 402) {
        return errorResponse(
          "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage.",
          402,
          { requestId, error: "PAYMENT_REQUIRED" },
        );
      }
      if (
        httpErr?.status === 503 ||
        /UNAVAILABLE|overloaded|high demand/i.test(httpErr?.body || "")
      ) {
        return errorResponse(
          "A IA está temporariamente sobrecarregada. Aguarde alguns segundos e tente novamente.",
          503,
          { requestId, error: "MODEL_OVERLOADED" },
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
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    const message = err instanceof Error ? err.message : "Internal error";
    logRequestCompletion(ctx, "error", message);
    return errorResponse(message, 500, {
      requestId,
      error: "INTERNAL_ERROR",
    });
  }
});
