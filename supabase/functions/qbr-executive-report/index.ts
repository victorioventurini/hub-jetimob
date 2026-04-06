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
import {
  successResponse,
  errorResponse,
} from "../_shared/response.ts";
import { resolveLLMConfig, llmComplete, mapLLMError, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// Types
// ============================================================================

interface ReportRequest {
  cycleId: string;
}

interface ReportResponse {
  quarterNarrative: string;
  proposalsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamProposals: Array<{
    teamName: string;
    objectiveTitle: string;
    krCount: number;
  }>;
}

// ============================================================================
// Helpers
// ============================================================================

function calculateKrProgress(baseline: number, current: number, target: number, direction: string): number {
  const range = Math.abs(target - baseline);
  if (range === 0) return current === target ? 100 : 0;
  const progress = direction === 'down'
    ? ((baseline - current) / (baseline - target)) * 100
    : ((current - baseline) / (target - baseline)) * 100;
  return Math.round(Math.max(0, progress));
}

function buildTeamHealthSummary(teamObjectives: any[], teams: Map<string, string>) {
  const teamMap = new Map<string, { name: string; achieved: number; onTrack: number; atRisk: number; offTrack: number; total: number }>();

  for (const obj of teamObjectives) {
    const teamId = obj.team_id;
    const teamName = teams.get(teamId) || 'Unknown';
    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, { name: teamName, achieved: 0, onTrack: 0, atRisk: 0, offTrack: 0, total: 0 });
    }
    const entry = teamMap.get(teamId)!;
    for (const kr of (obj.key_results || [])) {
      if (kr.deleted_at || kr.cancelled_at) continue;
      entry.total++;
      const progress = calculateKrProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || 'up'
      );
      if (progress >= 100) entry.achieved++;
      else if (kr.status === 'green') entry.onTrack++;
      else if (kr.status === 'yellow') entry.atRisk++;
      else if (kr.status === 'red') entry.offTrack++;
      else entry.onTrack++;
    }
  }

  return Array.from(teamMap.values());
}

function buildKpiSummary(kpis: any[]) {
  return kpis.map(kpi => {
    const values = (kpi.values || []).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = values[0];
    return {
      name: kpi.name,
      category: kpi.category,
      unit: kpi.unit,
      direction: kpi.direction,
      targetValue: kpi.target_value,
      currentValue: latest?.value ?? null,
      ragStatus: latest?.rag_status ?? null,
      periodLabel: latest?.period_label ?? null,
    };
  });
}

function extractLearnings(sessions: any[]) {
  const learnings: Array<{ teamId: string; whatWorked: string; whatDidntWork: string; debts: string }> = [];
  for (const session of sessions) {
    const data = session.reflection_data?.data ?? session.reflection_data ?? {};
    learnings.push({
      teamId: session.team_id,
      whatWorked: data.learnings?.whatWorked || data.whatWorked || '',
      whatDidntWork: data.learnings?.whatDidntWork || data.whatDidntWork || '',
      debts: data.learnings?.debts || data.debts || '',
    });
  }
  return learnings;
}

function extractDecisions(sessions: any[]) {
  const decisions: string[] = [];
  for (const session of sessions) {
    const data = session.reflection_data?.data ?? session.reflection_data ?? {};
    const items = data.decisions || data.itensDecisao || data.nextSteps || [];
    if (Array.isArray(items)) {
      for (const item of items) {
        const text = typeof item === 'string' ? item : item?.text || item?.title;
        if (text) decisions.push(text);
      }
    }
  }
  return decisions;
}

function extractCLevelFlags(session: any) {
  if (!session) return [];
  const data = session.reflection_data?.data ?? session.reflection_data ?? {};
  const flags: string[] = [];
  const calibrations = data.calibrations || data.teamCalibrations || {};
  for (const [teamId, cal] of Object.entries(calibrations as Record<string, any>)) {
    if (cal?.flag) flags.push(`${teamId}: ${cal.flag}`);
  }
  return flags;
}

function extractNextCycleProposals(sessions: any[], teams: Map<string, string>) {
  const proposals: Array<{ teamName: string; objectiveTitle: string; krCount: number }> = [];
  for (const session of sessions) {
    const data = session.reflection_data?.data ?? session.reflection_data ?? {};
    const nextOkrs = data.nextCycleOkrs || data.proposedOkrs || [];
    const teamName = teams.get(session.team_id) || 'Time';
    if (Array.isArray(nextOkrs)) {
      for (const okr of nextOkrs) {
        proposals.push({
          teamName,
          objectiveTitle: okr.title || okr.objective || 'Sem título',
          krCount: (okr.keyResults || okr.krs || []).length,
        });
      }
    }
  }
  return proposals;
}

// ============================================================================
// Handler
// ============================================================================

async function handler(req: Request, ctx: RequestContext): Promise<Response> {
  const requestId = ctx.requestId;
  const buId = ctx.buId!;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, { requestId });
  }

  let body: ReportRequest;
  try {
    const raw = await req.clone().json();
    body = { cycleId: raw.cycleId };
  } catch {
    return errorResponse("Invalid JSON body", 400, { requestId });
  }

  if (!body.cycleId) {
    return errorResponse("cycleId is required", 400, { requestId });
  }

  const sc = ctx.serviceClient;

  // 1. Fetch cycle info
  const { data: cycle, error: cycleErr } = await sc
    .from("cycles")
    .select("id, name, start_date, end_date, type, year, status")
    .eq("id", body.cycleId)
    .eq("bu_id", buId)
    .single();

  if (cycleErr || !cycle) {
    return errorResponse("Cycle not found", 404, { requestId });
  }

  const cycleYear = cycle.year ?? parseInt(cycle.start_date.substring(0, 4), 10);

  // 2. Team objectives + KRs
  const { data: teamObjectives } = await sc
    .from("okr_team_objectives")
    .select(`
      id, title, status, team_id,
      key_results:okr_team_key_results(
        id, title, current_value, target, baseline,
        direction, status, deleted_at, cancelled_at
      )
    `)
    .eq("cycle_id", body.cycleId)
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .neq("status", "cancelled");

  // 3. Teams lookup
  const { data: teamsData } = await sc
    .from("teams")
    .select("id, name")
    .eq("bu_id", buId)
    .is("deleted_at", null);

  const teamsMap = new Map((teamsData || []).map((t: any) => [t.id, t.name]));

  // 4. QBR-pre snapshots
  const { data: qbrPreSessions } = await sc
    .from("okr_wizard_sessions")
    .select("team_id, reflection_data, completed_at")
    .eq("wizard_type", "qbr-pre")
    .eq("cycle_id", body.cycleId)
    .eq("bu_id", buId)
    .eq("status", "completed");

  // 5. QBR-pre-clevel snapshot
  const { data: cLevelSession } = await sc
    .from("okr_wizard_sessions")
    .select("reflection_data")
    .eq("wizard_type", "qbr-pre-clevel")
    .eq("cycle_id", body.cycleId)
    .eq("bu_id", buId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 6. Org KPIs with latest values
  const { data: orgKpis } = await sc
    .from("kpi_metrics")
    .select(`
      id, name, category, unit, direction, target_value,
      values:kpi_values(value, rag_status, period_label, created_at)
    `)
    .eq("bu_id", buId)
    .eq("scope", "org")
    .eq("status", "active")
    .is("deleted_at", null);

  // 7. Org objectives
  const { data: orgObjectives } = await sc
    .from("okr_org_objectives")
    .select(`
      id, title,
      key_results:okr_org_key_results(
        id, title, current_value, target, baseline, direction, status
      )
    `)
    .eq("bu_id", buId)
    .eq("year", cycleYear)
    .is("deleted_at", null);

  // 8. Pending decisions from rituals
  const { data: decisionSessions } = await sc
    .from("okr_wizard_sessions")
    .select("reflection_data, wizard_type, team_id, completed_at")
    .eq("cycle_id", body.cycleId)
    .eq("bu_id", buId)
    .eq("status", "completed")
    .in("wizard_type", ["team-checkin", "mbr", "qbr-pre", "qbr-pre-clevel"]);

  // Build summaries for prompt
  const teamHealthSummary = buildTeamHealthSummary(teamObjectives || [], teamsMap);
  const kpisSummary = buildKpiSummary(orgKpis || []);
  const leaderLearnings = extractLearnings(qbrPreSessions || []);
  const nextCycleProposals = extractNextCycleProposals(qbrPreSessions || [], teamsMap);
  const cLevelFlags = extractCLevelFlags(cLevelSession);
  const pendingDecisions = extractDecisions(decisionSessions || []);

  // Resolve LLM
  const llmConfig = await resolveLLMConfig(sc, "google/gemini-3-flash-preview");
  if (!llmConfig) {
    return errorResponse("AI service not configured", 500, { requestId, error: "AI_NOT_CONFIGURED" });
  }
  llmConfig.maxTokens = 2000;
  llmConfig.temperature = 0.4;

  const systemPrompt = `Você é um consultor estratégico preparando um relatório executivo de QBR para o CEO de uma empresa.
Escreva em português brasileiro, tom executivo e direto.
NUNCA use linguagem punitiva — use "abaixo do ritmo esperado" em vez de "atrasado" ou "fracasso".
Nunca limite progresso a 100% — 156% é uma superação real e deve ser celebrada.
Responda APENAS com JSON válido, sem markdown, sem explicações adicionais.`;

  const userPrompt = `Gere o relatório executivo para o ciclo "${cycle.name}".

=== ENTREGA DOS TIMES ===
${JSON.stringify(teamHealthSummary)}

=== KPIs ORGANIZACIONAIS ===
${JSON.stringify(kpisSummary)}

=== APRENDIZADOS DOS LÍDERES (qbr-pre) ===
${JSON.stringify(leaderLearnings.slice(0, 10))}

=== PROPOSTAS PARA O PRÓXIMO CICLO ===
${JSON.stringify(nextCycleProposals.slice(0, 15))}

=== FLAGS DO C-LEVEL ===
${JSON.stringify(cLevelFlags)}

=== DECISÕES PENDENTES ===
${JSON.stringify(pendingDecisions.slice(0, 10))}

=== OKRs ORGANIZACIONAIS ===
${JSON.stringify((orgObjectives || []).map(o => ({
  title: o.title,
  krs: (o.key_results || []).map((kr: any) => ({
    title: kr.title,
    progress: calculateKrProgress(Number(kr.baseline) || 0, Number(kr.current_value) || 0, Number(kr.target) || 0, kr.direction || 'up'),
    status: kr.status,
  })),
})))}

Gere o relatório em JSON com exatamente esta estrutura:
{
  "quarterNarrative": "parágrafo de 5-8 linhas interpretando o quarter",
  "proposalsAnalysis": "parágrafo de 4-6 linhas analisando as propostas do próximo ciclo",
  "kpiInsights": {
    "healthy": "1-2 linhas sobre os KPIs em boa forma (omitir se não houver)",
    "atRisk": "1-2 linhas sobre os KPIs que merecem atenção (omitir se não houver)",
    "critical": "1-2 linhas sobre os KPIs críticos (omitir se não houver)"
  },
  "decisionsNeeded": [
    "item 1 — direto ao ponto",
    "item 2"
  ]
}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await llmComplete(llmConfig, messages, {
      maxTokens: 2000,
      temperature: 0.4,
    });

    if (!response.content) {
      return errorResponse("Empty AI response", 500, { requestId });
    }

    let parsed: any;
    try {
      let jsonStr = response.content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
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
      decisionsNeeded: Array.isArray(parsed.decisionsNeeded) ? parsed.decisionsNeeded : [],
      teamProposals: nextCycleProposals,
    };

    return successResponse(reportData);
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    console.error(`[${requestId}] LLM call failed:`, error.message);

    if (error.status) {
      const mapped = mapLLMError(error.status, requestId);
      return errorResponse(mapped.message, mapped.httpStatus, { requestId, error: mapped.code });
    }

    return errorResponse("AI service error", 500, { requestId, error: error.message });
  }
}

// ============================================================================
// Serve
// ============================================================================

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
