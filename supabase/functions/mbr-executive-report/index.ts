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

type ReportJobEnvelope = {
  success?: boolean;
  data?: unknown;
  error?: { message?: string; code?: string };
};

async function markReportJobFailed(
  sc: RequestContext["serviceClient"],
  jobId: string,
  body: ReportRequest,
  requestId: string,
  message: string,
  code = "MBR_REPORT_GENERATION_FAILED",
): Promise<void> {
  await sc
    .from("okr_wizard_sessions")
    .update({
      status: "abandoned",
      reflection_data: {
        monthRef: body.monthRef,
        generationStatus: "failed",
        aiGenerationStatus: "failed",
        failedAt: new Date().toISOString(),
        requestId,
        errorMessage: message,
        errorCode: code,
      },
    })
    .eq("id", jobId);
}

async function runReportJob(
  reqUrl: string,
  ctx: RequestContext,
  jobId: string,
  body: ReportRequest,
  parentRequestId: string,
): Promise<void> {
  const jobRequestId = `${parentRequestId}:job`;
  const jobCtx: RequestContext = { ...ctx, requestId: jobRequestId };
  const internalReq = new Request(reqUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cycleId: body.cycleId,
      monthRef: body.monthRef,
      bu_id: ctx.buId,
      mode: "sync",
      jobRequestId,
    }),
  });

  try {
    const response = await handler(internalReq, jobCtx);
    const payload = await response.json().catch(() => null) as ReportJobEnvelope | null;
    if (!response.ok || payload?.success === false) {
      const message = payload?.error?.message || `Report generation failed with HTTP ${response.status}`;
      await markReportJobFailed(ctx.serviceClient, jobId, body, jobRequestId, message, payload?.error?.code);
      return;
    }

    const reportData = payload?.data ?? payload;
    await ctx.serviceClient
      .from("okr_wizard_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        reflection_data: reportData,
      })
      .eq("id", jobId);
  } catch (err) {
    const error = err as Error;
    console.error(`[${jobRequestId}] Background MBR report job failed:`, error?.message || err);
    await markReportJobFailed(
      ctx.serviceClient,
      jobId,
      body,
      jobRequestId,
      error?.message || "Unknown report generation error",
    );
  }
}

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
    let mode: "async" | "sync" = "async";
    try {
      const raw = await req.json() as Partial<ReportRequest> & { mode?: string };
      body = {
        cycleId: typeof raw?.cycleId === "string" ? raw.cycleId : "",
        monthRef: typeof raw?.monthRef === "string" ? raw.monthRef : "",
      };
      mode = raw?.mode === "sync" ? "sync" : "async";
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

    if (mode === "async") {
      const { data: profile, error: profileErr } = await ctx.serviceClient
        .from("profiles")
        .select("id")
        .eq("user_id", ctx.user!.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (profileErr || !profile?.id) {
        console.error(`[${requestId}] Profile lookup for report job failed:`, profileErr?.message);
        return errorResponse("Profile not found", 403, { requestId, error: "PROFILE_NOT_FOUND" });
      }

      const { data: existingJobs } = await ctx.serviceClient
        .from("okr_wizard_sessions")
        .select("id, reflection_data")
        .eq("wizard_type", "mbr-executive-report")
        .eq("cycle_id", body.cycleId)
        .eq("bu_id", buId)
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(10);
      const existingJob = (existingJobs || []).find((row: { id: string; reflection_data?: { monthRef?: string } | null }) =>
        row.reflection_data?.monthRef === body.monthRef,
      );
      if (existingJob?.id) {
        return successResponse({ jobId: existingJob.id, status: "generating" }, undefined, 202);
      }

      const { data: job, error: jobErr } = await ctx.serviceClient
        .from("okr_wizard_sessions")
        .insert({
          wizard_type: "mbr-executive-report",
          cycle_id: body.cycleId,
          bu_id: buId,
          started_by: profile.id,
          status: "in_progress",
          reflection_data: {
            monthRef: body.monthRef,
            generationStatus: "generating",
            aiGenerationStatus: "generating",
            startedAt: new Date().toISOString(),
            requestId,
          },
          structure_version: "v1",
        })
        .select("id")
        .single();

      if (jobErr || !job?.id) {
        console.error(`[${requestId}] Failed to create MBR report job:`, jobErr?.message);
        return errorResponse("Failed to start report generation", 500, {
          requestId,
          error: "REPORT_JOB_CREATE_FAILED",
        });
      }

      const work = runReportJob(req.url, ctx, job.id, body, requestId);
      const edgeRuntime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
      }).EdgeRuntime;
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(work);
      else work.catch((err) => console.error(`[${requestId}] report job background error:`, err));

      return successResponse({ jobId: job.id, status: "generating" }, undefined, 202);
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
    // Sequential map-reduce: 4 partial analyses serialized + 1 consolidation.
    // Sequencial (não paralelo) para evitar rajadas de 429 no gateway de IA
    // quando vários partials disparam retries simultâneos.
    // ----------------------------------------------------------------------
    const INTER_CALL_DELAY_MS = 600;
    const pause = () => new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

    try {
      const monthLabelStr = monthLabel(body.monthRef);

      let projectsPartial: ProjectsPartial = { projectsAnalysis: "" };
      let krIssuesPartial: KrIssuesPartial = { krIssuesAnalysis: "" };
      let kpisPartial: KpiInsightsPartial = { kpiInsights: { healthy: "", atRisk: "", critical: "" } };
      let decisionsPartial: DecisionsPartial = { decisionsNeeded: [] };

      try {
        projectsPartial = await analyzeProjects(llmConfig, projectIssues, requestId);
      } catch (e) {
        console.warn(`[${requestId}] analyzeProjects rejected:`, (e as Error)?.message);
      }
      await pause();

      try {
        krIssuesPartial = await analyzeKrIssues(llmConfig, krIssues, orgObjectivesSummary, requestId);
      } catch (e) {
        console.warn(`[${requestId}] analyzeKrIssues rejected:`, (e as Error)?.message);
      }
      await pause();

      try {
        kpisPartial = await analyzeKpis(llmConfig, kpisSummary, kpiIssues, kpisToCreate, monthLabelStr, requestId);
      } catch (e) {
        console.warn(`[${requestId}] analyzeKpis rejected:`, (e as Error)?.message);
      }
      await pause();

      try {
        decisionsPartial = await analyzeDecisions(llmConfig, pendingDecisions, agendaSuggestions, requestId);
      } catch (e) {
        console.warn(`[${requestId}] analyzeDecisions rejected:`, (e as Error)?.message);
      }
      await pause();

      let consolidation = {
        monthNarrative: "",
        commitmentsAnalysis: "",
        leaderSignals: "",
      };
      let consolidationFailed = false;
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
        console.warn(`[${requestId}] Consolidation failed (using deterministic fallback):`, error.message);
        consolidationFailed = true;
      }

      // Fallback determinístico para a narrativa quando a IA falhar — garante
      // que o relatório seja válido e persistível mesmo sob rate limit.
      const aiGenerationStatus: 'ok' | 'partial_fallback' = consolidationFailed
        ? 'partial_fallback'
        : 'ok';

      if (!consolidation.monthNarrative) {
        const teamsCount = analyzedTeams.length;
        const overall = overallAchievement.overallProgress;
        const krIssuesCount = krIssues.length;
        const projIssuesCount = projectIssues.length;
        const decisionsCount = decisionsPartial.decisionsNeeded.length || pendingDecisions.length;
        consolidation.monthNarrative =
          `Relatório executivo de ${monthLabelStr} consolidado a partir de ${teamsCount} ` +
          `time(s) com MBR-pré submetido. Atingimento médio dos OKRs do ciclo: ${overall}%. ` +
          `Foram registrados ${krIssuesCount} KR(s) fora da meta e ${projIssuesCount} projeto(s)/marco(s) ` +
          `com atraso ou risco no mês. Há ${decisionsCount} decisão(ões) pendente(s) sinalizada(s) pelos líderes. ` +
          `A narrativa analítica completa não pôde ser gerada por instabilidade temporária da IA — ` +
          `as seções de análises parciais, KPIs, projetos, KRs, compromissos e decisões abaixo refletem ` +
          `os dados oficiais submetidos pelos times.`;
      }
      if (!consolidation.commitmentsAnalysis && teamCommitments.length > 0) {
        consolidation.commitmentsAnalysis =
          `Compromissos consolidados de ${teamCommitments.length} time(s) para o próximo mês. ` +
          `Consulte a seção "Compromissos por Time" para o detalhamento de foco e dependências cruzadas.`;
      }
      if (!consolidation.leaderSignals && (pendingDecisions.length > 0 || agendaSuggestions.length > 0)) {
        consolidation.leaderSignals =
          `Líderes registraram ${pendingDecisions.length} decisão(ões) pendente(s) e ` +
          `${agendaSuggestions.length} sugestão(ões) de pauta. Detalhes nas seções correspondentes.`;
      }

      const reportData: ReportResponse & { aiGenerationStatus?: string } = {
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
        aiGenerationStatus,
      };

      console.log(
        `[${requestId}] MBR executive report generated successfully (sequential, status=${aiGenerationStatus})`,
      );
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
