/**
 * qbr-executive-report
 *
 * Generates an AI-powered executive QBR report consolidating OKRs, KPIs,
 * ritual snapshots, and pending decisions for the quarter.
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
import { loadCycle, loadPrimaryKpiValuesForKrs, loadReportData } from "./data-loader.ts";
import {
  buildAnalyzedTeams,
  buildKpiSummary,
  buildOverallAchievement,
  buildTeamHealthSummary,
  dedupSessionsByTeam,
  extractCLevelFlags,
  extractDecisions,
  extractKrSummary,
  extractLearnings,
  extractNextCycleProposals,
} from "./extractors.ts";
import {
  buildQbrExecUserPrompt,
  QBR_EXEC_SYSTEM_PROMPT,
} from "./prompts.ts";
import type {
  AnalyzedTeam,
  KrRow,
  OrgObjectiveRow,
  ParsedReport,
  ReportRequest,
  ReportResponse,
  TeamObjectiveRow,
} from "./types.ts";

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
      body = { cycleId: typeof raw?.cycleId === "string" ? raw.cycleId : "" };
    } catch (parseError) {
      console.error(`[${requestId}] Invalid JSON body:`, parseError);
      return errorResponse("Invalid JSON body", 400, { requestId });
    }

    if (!body.cycleId) {
      return errorResponse("cycleId is required", 400, { requestId });
    }

    console.log(
      `[${requestId}] Generating QBR executive report for cycle ${body.cycleId}`,
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
    console.log(`[${requestId}] Loaded cycle ${cycle.name} (${cycleYear})`);

    const [
      { data: teamObjectives, error: teamObjectivesErr },
      { data: teamsData, error: teamsErr },
      { data: qbrPreSessions, error: qbrPreErr },
      { data: cLevelSession, error: cLevelErr },
      { data: orgKpis, error: orgKpisErr },
      { data: orgObjectives, error: orgObjectivesErr },
      { data: decisionSessions, error: decisionSessionsErr },
    ] = await loadReportData(sc, body.cycleId, buId, cycleYear);

    if (teamObjectivesErr) console.error(`[${requestId}] Team objectives query error:`, teamObjectivesErr.message);
    if (teamsErr) console.error(`[${requestId}] Teams query error:`, teamsErr.message);
    if (qbrPreErr) console.error(`[${requestId}] QBR-pre sessions query error:`, qbrPreErr.message);
    if (cLevelErr) console.error(`[${requestId}] QBR-pre-clevel session query error:`, cLevelErr.message);
    if (orgKpisErr) console.error(`[${requestId}] Org KPIs query error:`, orgKpisErr.message);
    if (orgObjectivesErr) console.error(`[${requestId}] Org objectives query error:`, orgObjectivesErr.message);
    if (decisionSessionsErr) console.error(`[${requestId}] Decision sessions query error:`, decisionSessionsErr.message);

    const teamsMap = new Map(
      (teamsData || []).map((t: { id: string; name: string }) => [t.id, t.name]),
    );

    // Deduplica QBR-pré por team_id (mais recente vence).
    const dedupedQbrPre = dedupSessionsByTeam(qbrPreSessions || []);

    // Resolve nomes dos líderes (started_by).
    const leaderIds = Array.from(
      new Set(dedupedQbrPre.map((s) => s.started_by).filter(Boolean) as string[]),
    );
    const profilesMap = new Map<string, string>();
    if (leaderIds.length > 0) {
      const { data: profilesData, error: profilesErr } = await sc
        .from("profiles")
        .select("id, display_name")
        .in("id", leaderIds);
      if (profilesErr) {
        console.error(`[${requestId}] Profiles lookup error:`, profilesErr.message);
      }
      for (const p of (profilesData || []) as Array<{ id: string; display_name: string | null }>) {
        if (p?.id && p.display_name) profilesMap.set(p.id, p.display_name);
      }
    }
    const analyzedTeams: AnalyzedTeam[] = buildAnalyzedTeams(dedupedQbrPre, teamsMap, profilesMap);

    // Resolve valor efetivo das KRs com KPI primária até o fim do ciclo
    // (Core Rule: Primary KPIs dictate KR progress automatically).
    const teamObjList = (teamObjectives || []) as TeamObjectiveRow[];
    const allKrIds: string[] = [];
    for (const obj of teamObjList) {
      for (const kr of obj.key_results || []) {
        if (kr.id) allKrIds.push(kr.id);
      }
    }
    const cycleEndIso = new Date(`${cycle.end_date}T23:59:59.999Z`).toISOString();
    const primaryKpiValues = await loadPrimaryKpiValuesForKrs(
      sc,
      allKrIds,
      cycleEndIso,
    );
    if (primaryKpiValues.size > 0) {
      for (const obj of teamObjList) {
        for (const kr of obj.key_results || []) {
          if (kr.id && primaryKpiValues.has(kr.id)) {
            (kr as KrRow).effective_current_value = primaryKpiValues.get(kr.id)!;
          }
        }
      }
    }

    const teamHealthSummary = buildTeamHealthSummary(teamObjList, teamsMap);
    const overallAchievement = buildOverallAchievement(teamObjList, teamsMap);
    const kpisSummary = buildKpiSummary(orgKpis || []);
    const leaderLearnings = extractLearnings(dedupedQbrPre);
    const nextCycleProposals = extractNextCycleProposals(dedupedQbrPre, teamsMap);
    const cLevelFlags = extractCLevelFlags(cLevelSession);
    const pendingDecisions = extractDecisions(decisionSessions || []);
    const orgObjectivesSummary = extractKrSummary((orgObjectives || []) as OrgObjectiveRow[]);

    console.log(
      `[${requestId}] Prompt data ready: analyzedTeams=${analyzedTeams.length}, teams=${teamHealthSummary.length}, kpis=${kpisSummary.length}, proposals=${nextCycleProposals.length}, decisions=${pendingDecisions.length}, overallProgress=${overallAchievement.overallProgress}, byTeam=${overallAchievement.byTeam.length}, byObjective=${overallAchievement.byObjective.length}, primaryKpiOverrides=${primaryKpiValues.size}`,
    );

    const llmConfig = await resolveLLMConfig(sc, "google/gemini-3-flash-preview");
    if (!llmConfig) {
      console.error(`[${requestId}] AI service not configured`);
      return errorResponse("AI service not configured", 500, {
        requestId,
        error: "AI_NOT_CONFIGURED",
      });
    }

    llmConfig.maxTokens = 2000;
    llmConfig.temperature = 0.4;

    const messages: LLMMessage[] = [
      { role: "system", content: QBR_EXEC_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildQbrExecUserPrompt({
          cycleName: cycle.name,
          teamHealthSummary,
          overallAchievement,
          kpisSummary,
          leaderLearnings,
          nextCycleProposals,
          cLevelFlags,
          pendingDecisions,
          orgObjectivesSummary,
        }),
      },
    ];

    console.log(`[${requestId}] Calling LLM for QBR executive report...`);

    try {
      const response = await llmComplete(llmConfig, messages, {
        maxTokens: 2000,
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
        quarterNarrative: parsed.quarterNarrative || "",
        proposalsAnalysis: parsed.proposalsAnalysis || "",
        kpiInsights: {
          healthy: parsed.kpiInsights?.healthy || "",
          atRisk: parsed.kpiInsights?.atRisk || "",
          critical: parsed.kpiInsights?.critical || "",
        },
        decisionsNeeded: Array.isArray(parsed.decisionsNeeded)
          ? parsed.decisionsNeeded
          : [],
        teamProposals: nextCycleProposals,
        overallAchievement,
        analyzedTeams,
      };

      console.log(`[${requestId}] QBR executive report generated successfully`);
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
    console.error(`[${requestId}] Unhandled error in qbr-executive-report:`, error?.message || err);
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
