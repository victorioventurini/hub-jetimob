/**
 * mbr-executive-report
 *
 * Generates an AI-powered executive MBR report consolidating the MBR-pré
 * snapshots submitted by leaders, organizational KPIs (up to the reference
 * month), org OKRs and pending decisions — for a given (cycle, monthRef).
 *
 * Espelha `qbr-executive-report`, mas com recorte MENSAL.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  withMiddleware,
  type RequestContext,
} from "../_shared/middleware.ts";
import { errorResponse, successResponse } from "../_shared/response.ts";
import {
  llmComplete,
  type LLMMessage,
  mapLLMError,
  resolveLLMConfig,
} from "../_shared/llm-client.ts";
import { tryParseAiJson } from "../_shared/ai-json.ts";
import { loadCycle, loadReportData } from "./data-loader.ts";
import {
  buildKpiSummary,
  buildTeamHealthSummary,
  extractAgendaSuggestions,
  extractDecisions,
  extractKpiIssues,
  extractKpisToCreate,
  extractKrIssues,
  extractKrSummary,
  extractMonthAnalyses,
  extractMonthlyHighlights,
  extractProjectIssues,
  extractTeamCommitments,
  filterSessionsByMonth,
} from "./extractors.ts";
import {
  buildMbrExecUserPrompt,
  MBR_EXEC_SYSTEM_PROMPT,
} from "./prompts.ts";
import type {
  OrgObjectiveRow,
  ParsedReport,
  ReportRequest,
  ReportResponse,
} from "./types.ts";

const MONTH_REF_RE = /^\d{4}-\d{2}$/;

function monthLabel(monthRef: string): string {
  const m = MONTH_REF_RE.exec(monthRef);
  if (!m) return monthRef;
  const d = new Date(Number(monthRef.slice(0, 4)), Number(monthRef.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function monthEndIso(monthRef: string): string {
  const year = Number(monthRef.slice(0, 4));
  const monthIdx = Number(monthRef.slice(5, 7)) - 1;
  return new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0) - 1).toISOString();
}

async function handler(req: Request, ctx: RequestContext): Promise<Response> {
  const requestId = ctx.requestId;
  const buId = ctx.buId!;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, { requestId });
  }

  try {
    let body: ReportRequest;
    try {
      const raw = await req.json() as Partial<ReportRequest>;
      body = {
        cycleId: typeof raw?.cycleId === "string" ? raw.cycleId : "",
        monthRef: typeof raw?.monthRef === "string" ? raw.monthRef : "",
      };
    } catch (parseError) {
      console.error(`[${requestId}] Invalid JSON body:`, parseError);
      return errorResponse("Invalid JSON body", 400, { requestId });
    }

    if (!body.cycleId) {
      return errorResponse("cycleId is required", 400, { requestId });
    }
    if (!body.monthRef || !MONTH_REF_RE.test(body.monthRef)) {
      return errorResponse("monthRef (YYYY-MM) is required", 400, { requestId });
    }

    console.log(
      `[${requestId}] Generating MBR executive report for cycle=${body.cycleId} month=${body.monthRef}`,
    );

    const sc = ctx.serviceClient;

    const { data: cycle, error: cycleErr } = await loadCycle(
      sc,
      body.cycleId,
      buId,
    );
    if (cycleErr || !cycle) {
      console.error(`[${requestId}] Cycle query error:`, cycleErr?.message);
      return errorResponse("Cycle not found", 404, { requestId });
    }

    const cycleYear = parseInt(String(cycle.start_date).substring(0, 4), 10);

    const [
      { data: teamObjectives, error: teamObjectivesErr },
      { data: teamsData, error: teamsErr },
      { data: mbrPreSessions, error: mbrPreErr },
      { data: mbrSessions, error: mbrErr },
      { data: orgKpis, error: orgKpisErr },
      { data: orgObjectives, error: orgObjectivesErr },
    ] = await loadReportData(sc, body.cycleId, buId, cycleYear);

    if (teamObjectivesErr) console.error(`[${requestId}] Team objectives error:`, teamObjectivesErr.message);
    if (teamsErr) console.error(`[${requestId}] Teams error:`, teamsErr.message);
    if (mbrPreErr) console.error(`[${requestId}] MBR-pre sessions error:`, mbrPreErr.message);
    if (mbrErr) console.error(`[${requestId}] MBR sessions error:`, mbrErr.message);
    if (orgKpisErr) console.error(`[${requestId}] Org KPIs error:`, orgKpisErr.message);
    if (orgObjectivesErr) console.error(`[${requestId}] Org objectives error:`, orgObjectivesErr.message);

    const teamsMap = new Map(
      (teamsData || []).map((t: { id: string; name: string }) => [t.id, t.name]),
    );

    // Filtra apenas as sessões cujo `referenceMonth` corresponde ao mês solicitado.
    const monthMbrPre = filterSessionsByMonth(mbrPreSessions || [], body.monthRef);
    const monthMbr = filterSessionsByMonth(mbrSessions || [], body.monthRef);

    const teamHealthSummary = buildTeamHealthSummary(teamObjectives || [], teamsMap);
    const kpisSummary = buildKpiSummary(orgKpis || [], monthEndIso(body.monthRef));
    const teamCommitments = extractTeamCommitments(monthMbrPre, teamsMap);
    const teamHighlights = extractMonthlyHighlights(monthMbrPre, teamsMap);
    const pendingDecisions = extractDecisions([...monthMbrPre, ...monthMbr]);
    const orgObjectivesSummary = extractKrSummary((orgObjectives || []) as OrgObjectiveRow[]);
    const projectIssues = extractProjectIssues(monthMbrPre, teamsMap);
    const krIssues = extractKrIssues(monthMbrPre, teamsMap);
    const kpiIssues = extractKpiIssues(monthMbrPre, teamsMap);
    const kpisToCreate = extractKpisToCreate(monthMbrPre, teamsMap);
    const agendaSuggestions = extractAgendaSuggestions(monthMbrPre, teamsMap);
    const monthAnalyses = extractMonthAnalyses(monthMbrPre, teamsMap);

    console.log(
      `[${requestId}] Prompt data: teams=${teamHealthSummary.length}, kpis=${kpisSummary.length}, commitments=${teamCommitments.length}, highlights=${teamHighlights.length}, decisions=${pendingDecisions.length}, projects=${projectIssues.length}, krIssues=${krIssues.length}, kpiIssues=${kpiIssues.length}, kpisToCreate=${kpisToCreate.length}, agenda=${agendaSuggestions.length}, monthAnalyses=${monthAnalyses.length}`,
    );

    if (monthMbrPre.length === 0) {
      return errorResponse(
        `Nenhum MBR-pré submetido para o mês ${body.monthRef}.`,
        409,
        { requestId, error: "NO_MBR_PRE_FOR_MONTH" },
      );
    }

    const llmConfig = await resolveLLMConfig(sc, "google/gemini-3-flash-preview");
    if (!llmConfig) {
      console.error(`[${requestId}] AI service not configured`);
      return errorResponse("AI service not configured", 500, {
        requestId,
        error: "AI_NOT_CONFIGURED",
      });
    }

    llmConfig.maxTokens = 2400;
    llmConfig.temperature = 0.4;

    const messages: LLMMessage[] = [
      { role: "system", content: MBR_EXEC_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildMbrExecUserPrompt({
          cycleName: cycle.name,
          monthLabel: monthLabel(body.monthRef),
          teamHealthSummary,
          kpisSummary,
          teamHighlights,
          teamCommitments,
          pendingDecisions,
          orgObjectivesSummary,
          projectIssues,
          krIssues,
          kpiIssues,
          kpisToCreate,
          agendaSuggestions,
          monthAnalyses,
        }),
      },
    ];

    try {
      const response = await llmComplete(llmConfig, messages, {
        maxTokens: 2400,
        temperature: 0.4,
      });

      if (!response.content) {
        return errorResponse("Empty AI response", 500, { requestId });
      }

      const parsed = tryParseAiJson<ParsedReport>(response.content, null);
      if (!parsed) {
        console.error(`[${requestId}] Failed to parse LLM JSON:`, response.content);
        return errorResponse("Failed to parse AI response", 500, { requestId });
      }

      const reportData: ReportResponse = {
        monthRef: body.monthRef,
        monthNarrative: parsed.monthNarrative || "",
        commitmentsAnalysis: parsed.commitmentsAnalysis || "",
        kpiInsights: {
          healthy: parsed.kpiInsights?.healthy || "",
          atRisk: parsed.kpiInsights?.atRisk || "",
          critical: parsed.kpiInsights?.critical || "",
        },
        decisionsNeeded: Array.isArray(parsed.decisionsNeeded)
          ? parsed.decisionsNeeded
          : [],
        teamCommitments,
        teamHighlights,
        projectsAnalysis: parsed.projectsAnalysis || "",
        krIssuesAnalysis: parsed.krIssuesAnalysis || "",
        leaderSignals: parsed.leaderSignals || "",
        projectIssues,
        krIssues,
        kpiIssues,
        kpisToCreate,
        agendaSuggestions,
        monthAnalyses,
      };

      console.log(`[${requestId}] MBR executive report generated successfully`);
      return successResponse(reportData);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      console.error(`[${requestId}] LLM call failed:`, error.message);

      if (error.status) {
        const mapped = mapLLMError(error.status, requestId);
        return errorResponse(mapped.message, mapped.httpStatus, {
          requestId,
          error: mapped.code,
        });
      }
      return errorResponse("AI service error", 500, {
        requestId,
        error: error.message,
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[${requestId}] Unhandled error in mbr-executive-report:`, error?.message || err);
    return errorResponse("Internal error", 500, {
      requestId,
      error: error?.message || "UNKNOWN_ERROR",
    });
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
  });

  if (!mw.success) return mw.error!;

  return handler(req, mw.context!);
});
