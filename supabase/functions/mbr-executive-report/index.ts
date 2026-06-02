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
  mapLLMError,
  resolveLLMConfig,
} from "../_shared/llm-client.ts";
import { loadCycle, loadPrimaryKpiValuesForKrs, loadReportData, ritualSubmissionWindowIso } from "./data-loader.ts";
import {
  buildAnalyzedTeams,
  buildKpiSummary,
  buildOverallAchievement,
  buildTeamHealthSummary,
  dedupSessionsByTeam,
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
} from "./extractors.ts";
import {
  analyzeDecisions,
  analyzeKpis,
  analyzeKrIssues,
  analyzeProjects,
  consolidateReport,
  type DecisionsPartial,
  type KpiInsightsPartial,
  type KrIssuesPartial,
  type ProjectsPartial,
} from "./partial-analyzers.ts";
import type {
  AnalyzedTeam,
  KrRow,
  OrgObjectiveRow,
  ReportRequest,
  ReportResponse,
  TeamObjectiveRow,
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

    const submissionWindow = ritualSubmissionWindowIso(body.monthRef);
    if (!submissionWindow) {
      return errorResponse("Invalid monthRef format", 400, { requestId });
    }
    console.log(
      `[${requestId}] Submission window for monthRef=${body.monthRef}: ${submissionWindow.start} → ${submissionWindow.end}`,
    );

    const [
      { data: teamObjectives, error: teamObjectivesErr },
      { data: teamsData, error: teamsErr },
      { data: mbrPreSessions, error: mbrPreErr },
      { data: mbrSessions, error: mbrErr },
      { data: orgKpis, error: orgKpisErr },
      { data: orgObjectives, error: orgObjectivesErr },
    ] = await loadReportData(sc, body.cycleId, buId, cycleYear, submissionWindow);

    if (teamObjectivesErr) console.error(`[${requestId}] Team objectives error:`, teamObjectivesErr.message);
    if (teamsErr) console.error(`[${requestId}] Teams error:`, teamsErr.message);
    if (mbrPreErr) console.error(`[${requestId}] MBR-pre sessions error:`, mbrPreErr.message);
    if (mbrErr) console.error(`[${requestId}] MBR sessions error:`, mbrErr.message);
    if (orgKpisErr) console.error(`[${requestId}] Org KPIs error:`, orgKpisErr.message);
    if (orgObjectivesErr) console.error(`[${requestId}] Org objectives error:`, orgObjectivesErr.message);

    const teamsMap = new Map(
      (teamsData || []).map((t: { id: string; name: string }) => [t.id, t.name]),
    );

    // Deduplica por team_id mantendo a sessão mais recente do mês.
    const monthMbrPre = dedupSessionsByTeam(mbrPreSessions || []);
    const monthMbr = dedupSessionsByTeam(mbrSessions || []);

    // Resolve nomes dos líderes (started_by) das sessões selecionadas.
    const leaderIds = Array.from(
      new Set(monthMbrPre.map((s) => s.started_by).filter(Boolean) as string[]),
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
    const analyzedTeams: AnalyzedTeam[] = buildAnalyzedTeams(monthMbrPre, teamsMap, profilesMap);

    // Resolve valor efetivo das KRs com KPI primária (Core Rule canônica).
    const teamObjList = (teamObjectives || []) as TeamObjectiveRow[];
    const allKrIds: string[] = [];
    for (const obj of teamObjList) {
      for (const kr of obj.key_results || []) {
        if (kr.id) allKrIds.push(kr.id);
      }
    }
    const monthEndIsoVal = monthEndIso(body.monthRef);
    const primaryKpiValues = await loadPrimaryKpiValuesForKrs(
      sc,
      allKrIds,
      monthEndIsoVal,
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
    const kpisSummary = buildKpiSummary(orgKpis || [], monthEndIsoVal);
    const teamCommitments = extractTeamCommitments(monthMbrPre, teamsMap);
    const teamHighlights = extractMonthlyHighlights(monthMbrPre, teamsMap);
    const pendingDecisions = extractDecisions([...monthMbrPre, ...monthMbr]);
    const orgObjectivesSummary = extractKrSummary((orgObjectives || []) as OrgObjectiveRow[]);
    const projectIssues = extractProjectIssues(monthMbrPre, teamsMap);
    await enrichProjectIssueNames(sc, projectIssues);
    const krIssues = extractKrIssues(monthMbrPre, teamsMap);
    await enrichKrIssueTitles(sc, krIssues, teamObjList);
    const kpiIssues = extractKpiIssues(monthMbrPre, teamsMap);
    const kpisToCreate = extractKpisToCreate(monthMbrPre, teamsMap);
    const agendaSuggestions = extractAgendaSuggestions(monthMbrPre, teamsMap);
    const monthAnalyses = extractMonthAnalyses(monthMbrPre, teamsMap);

    console.log(
      `[${requestId}] Prompt data: analyzedTeams=${analyzedTeams.length}, teams=${teamHealthSummary.length}, kpis=${kpisSummary.length}, commitments=${teamCommitments.length}, highlights=${teamHighlights.length}, decisions=${pendingDecisions.length}, projects=${projectIssues.length}, krIssues=${krIssues.length}, kpiIssues=${kpiIssues.length}, kpisToCreate=${kpisToCreate.length}, agenda=${agendaSuggestions.length}, monthAnalyses=${monthAnalyses.length}, overallProgress=${overallAchievement.overallProgress}, byTeam=${overallAchievement.byTeam.length}, byObjective=${overallAchievement.byObjective.length}, primaryKpiOverrides=${primaryKpiValues.size}`,
    );

    if (monthMbrPre.length === 0) {
      return errorResponse(
        `Nenhum MBR-pré submetido para o mês ${body.monthRef}.`,
        409,
        { requestId, error: "NO_MBR_PRE_FOR_MONTH" },
      );
    }


    const llmConfig = await resolveLLMConfig(sc, "google/gemini-3.5-flash");
    if (!llmConfig) {
      console.error(`[${requestId}] AI service not configured`);
      return errorResponse("AI service not configured", 500, {
        requestId,
        error: "AI_NOT_CONFIGURED",
      });
    }

    // ----------------------------------------------------------------------
    // Map-reduce: 4 partial analyses in parallel + 1 consolidation
    // ----------------------------------------------------------------------
    try {
      const monthLabelStr = monthLabel(body.monthRef);

      const [projectsRes, krIssuesRes, kpisRes, decisionsRes] = await Promise.allSettled([
        analyzeProjects(llmConfig, projectIssues, requestId),
        analyzeKrIssues(llmConfig, krIssues, orgObjectivesSummary, requestId),
        analyzeKpis(llmConfig, kpisSummary, kpiIssues, kpisToCreate, monthLabelStr, requestId),
        analyzeDecisions(llmConfig, pendingDecisions, agendaSuggestions, requestId),
      ]);

      const projectsPartial: ProjectsPartial = projectsRes.status === "fulfilled"
        ? projectsRes.value
        : (console.warn(`[${requestId}] analyzeProjects rejected:`, projectsRes.reason), { projectsAnalysis: "" });
      const krIssuesPartial: KrIssuesPartial = krIssuesRes.status === "fulfilled"
        ? krIssuesRes.value
        : (console.warn(`[${requestId}] analyzeKrIssues rejected:`, krIssuesRes.reason), { krIssuesAnalysis: "" });
      const kpisPartial: KpiInsightsPartial = kpisRes.status === "fulfilled"
        ? kpisRes.value
        : (console.warn(`[${requestId}] analyzeKpis rejected:`, kpisRes.reason), { kpiInsights: { healthy: "", atRisk: "", critical: "" } });
      const decisionsPartial: DecisionsPartial = decisionsRes.status === "fulfilled"
        ? decisionsRes.value
        : (console.warn(`[${requestId}] analyzeDecisions rejected:`, decisionsRes.reason), { decisionsNeeded: [] });

      let consolidation = {
        monthNarrative: "",
        commitmentsAnalysis: "",
        leaderSignals: "",
      };
      try {
        consolidation = await consolidateReport(llmConfig, {
          cycleName: cycle.name,
          monthLabel: monthLabelStr,
          overallAchievement,
          teamHealthSummary,
          teamHighlights,
          teamCommitments,
          monthAnalyses,
          projectsAnalysis: projectsPartial.projectsAnalysis,
          krIssuesAnalysis: krIssuesPartial.krIssuesAnalysis,
          kpiInsights: kpisPartial.kpiInsights,
          decisionsNeeded: decisionsPartial.decisionsNeeded,
        }, requestId);
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        console.warn(`[${requestId}] Consolidation failed (returning partial report):`, error.message);
      }

      const reportData: ReportResponse = {
        monthRef: body.monthRef,
        monthNarrative: consolidation.monthNarrative,
        commitmentsAnalysis: consolidation.commitmentsAnalysis,
        kpiInsights: kpisPartial.kpiInsights,
        decisionsNeeded: decisionsPartial.decisionsNeeded,
        teamCommitments,
        teamHighlights,
        projectsAnalysis: projectsPartial.projectsAnalysis,
        krIssuesAnalysis: krIssuesPartial.krIssuesAnalysis,
        leaderSignals: consolidation.leaderSignals,
        projectIssues,
        krIssues,
        kpiIssues,
        kpisToCreate,
        agendaSuggestions,
        monthAnalyses,
        overallAchievement,
        analyzedTeams,
      };

      console.log(`[${requestId}] MBR executive report generated successfully (map-reduce)`);
      return successResponse(reportData);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      console.error(`[${requestId}] Unhandled map-reduce error:`, error.message);

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

/**
 * Enriquece projectIssues com nome do projeto/marco (e nome do projeto pai
 * para marcos), buscando em batch nas tabelas `projects` e `project_milestones`.
 */
async function enrichProjectIssueNames(
  // deno-lint-ignore no-explicit-any
  sc: any,
  issues: import("./types.ts").ProjectIssue[],
): Promise<void> {
  if (issues.length === 0) return;

  const projectIds = new Set<string>();
  const milestoneIds = new Set<string>();
  for (const it of issues) {
    if (!it.refId) continue;
    if (it.kind === "project") projectIds.add(it.refId);
    else milestoneIds.add(it.refId);
  }

  const projectNameById = new Map<string, string>();
  const milestoneInfoById = new Map<string, { name: string; project_id: string }>();

  const [projRes, msRes] = await Promise.all([
    projectIds.size > 0
      ? sc.from("projects").select("id, name").in("id", Array.from(projectIds))
      : Promise.resolve({ data: [] }),
    milestoneIds.size > 0
      ? sc.from("project_milestones").select("id, name, project_id").in("id", Array.from(milestoneIds))
      : Promise.resolve({ data: [] }),
  ]);

  for (const p of (projRes.data || []) as Array<{ id: string; name: string }>) {
    projectNameById.set(p.id, p.name);
  }
  for (const m of (msRes.data || []) as Array<{ id: string; name: string; project_id: string }>) {
    milestoneInfoById.set(m.id, { name: m.name, project_id: m.project_id });
  }

  // Buscar nomes dos projetos pai de marcos que ainda não foram carregados.
  const parentProjectIds = new Set<string>();
  for (const info of milestoneInfoById.values()) {
    if (info.project_id && !projectNameById.has(info.project_id)) {
      parentProjectIds.add(info.project_id);
    }
  }
  if (parentProjectIds.size > 0) {
    const { data } = await sc
      .from("projects")
      .select("id, name")
      .in("id", Array.from(parentProjectIds));
    for (const p of (data || []) as Array<{ id: string; name: string }>) {
      projectNameById.set(p.id, p.name);
    }
  }

  for (const it of issues) {
    if (it.kind === "project") {
      const name = projectNameById.get(it.refId);
      if (name) it.name = name;
    } else {
      const info = milestoneInfoById.get(it.refId);
      if (info) {
        it.name = info.name;
        const parent = projectNameById.get(info.project_id);
        if (parent) it.projectName = parent;
      }
    }
  }
}

/**
 * Enriquece krIssues com o título do KR. Primeiro tenta resolver a partir
 * dos team_objectives já carregados; KRs ausentes (ex.: removidos do escopo
 * atual) são buscados em batch em `okr_team_key_results`.
 */
async function enrichKrIssueTitles(
  // deno-lint-ignore no-explicit-any
  sc: any,
  issues: import("./types.ts").KrIssue[],
  teamObjList: import("./types.ts").TeamObjectiveRow[],
): Promise<void> {
  if (issues.length === 0) return;

  const titleById = new Map<string, string>();
  for (const obj of teamObjList) {
    for (const kr of obj.key_results || []) {
      if (kr.id && kr.title) titleById.set(kr.id, kr.title);
    }
  }

  const missing = Array.from(
    new Set(
      issues
        .map((i) => i.krId)
        .filter((id) => id && !titleById.has(id)),
    ),
  );
  if (missing.length > 0) {
    const { data } = await sc
      .from("okr_team_key_results")
      .select("id, title")
      .in("id", missing);
    for (const r of (data || []) as Array<{ id: string; title: string }>) {
      if (r?.id && r.title) titleById.set(r.id, r.title);
    }
  }

  for (const it of issues) {
    const t = titleById.get(it.krId);
    if (t) it.title = t;
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
