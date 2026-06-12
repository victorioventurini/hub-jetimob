// Tools (read-only) for the CEO copilot. Each tool is invoked by the LLM
// with a JSON args payload. Returns a structured JSON payload that's small
// enough to fit in the next prompt iteration but rich enough for the model
// to cross-reference data.
//
// All tools are BU-scoped: bu_id is injected server-side from the request
// context — the model can never query another BU.

import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import { calculateKrProgress } from "../_shared/okr-progress.ts";

type Json = Record<string, unknown>;

export interface ToolContext {
  svc: EdgeSupabaseClient;
  buId: string;
}

// ----------------------------------------------------------------------------
// JSON Schemas — exposed to the LLM
// ----------------------------------------------------------------------------
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "query_okrs",
      description:
        "Lista OKRs (objetivos + key results) da BU, com progresso canônico. " +
        "Use para responder perguntas sobre objetivos, KRs, atingimento, status, ciclo.",
      parameters: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["org", "team", "both"], description: "Org, Time ou ambos. Default: both." },
          cycle_id: { type: "string", description: "Filtrar por ciclo (UUID). Opcional." },
          team_id: { type: "string", description: "Filtrar por time (UUID). Opcional." },
          status_filter: {
            type: "array",
            items: { type: "string" },
            description: "Lista de status (ex: ['on_track','at_risk','off_track']). Opcional.",
          },
          limit: { type: "number", description: "Máx KRs retornados. Default 200." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_kpis",
      description:
        "Retorna metadados + valores históricos dos KPIs da BU em um período. " +
        "Use para tendências, comparações temporais, atingimento de meta.",
      parameters: {
        type: "object",
        properties: {
          area_id: { type: "string" },
          team_id: { type: "string" },
          date_from: { type: "string", description: "YYYY-MM-DD inclusive. Default: início do ano corrente." },
          date_to: { type: "string", description: "YYYY-MM-DD inclusive. Default: hoje." },
          kpi_ids: { type: "array", items: { type: "string" }, description: "KPIs específicos (UUIDs)." },
          limit_kpis: { type: "number", description: "Máx KPIs. Default 100." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_projects",
      description:
        "Lista projetos com milestones e vínculos com KRs. Use para perguntas sobre entregas, prazos, riscos, conexão entre projeto e OKR.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "array", items: { type: "string" } },
          team_id: { type: "string" },
          include_milestones: { type: "boolean", description: "Default true." },
          limit: { type: "number", description: "Máx projetos. Default 80." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_checkins",
      description:
        "Check-ins recentes de KRs com confiança e blockers. Use para sentir o pulso de execução.",
      parameters: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "YYYY-MM-DD. Default: 90 dias atrás." },
          date_to: { type: "string" },
          limit: { type: "number", description: "Default 200." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_decisions",
      description:
        "Decisões formais registradas no módulo de Análise (rascunhos e publicadas).",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Default 50." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_cycles_and_teams",
      description:
        "Lista ciclos ativos e times da BU. Use SEMPRE no início se o usuário mencionar 'time X', 'Q1', 'Q2' sem dar UUID — para descobrir os IDs corretos antes das outras queries.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

// ----------------------------------------------------------------------------
// Implementations
// ----------------------------------------------------------------------------

export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<Json> {
  let args: Json = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: "invalid_args_json" };
  }

  try {
    switch (name) {
      case "query_okrs":
        return await queryOkrs(args, ctx);
      case "query_kpis":
        return await queryKpis(args, ctx);
      case "query_projects":
        return await queryProjects(args, ctx);
      case "query_checkins":
        return await queryCheckins(args, ctx);
      case "query_decisions":
        return await queryDecisions(args, ctx);
      case "list_cycles_and_teams":
        return await listCyclesAndTeams(ctx);
      default:
        return { error: `unknown_tool:${name}` };
    }
  } catch (err) {
    return { error: String((err as Error)?.message ?? err) };
  }
}

// ---- list_cycles_and_teams -------------------------------------------------
async function listCyclesAndTeams(ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const [cyclesRes, teamsRes, areasRes] = await Promise.all([
    svc.from("cycles")
      .select("id, name, year, quarter, start_date, end_date, status")
      .eq("bu_id", buId)
      .order("start_date", { ascending: false })
      .limit(20),
    svc.from("teams")
      .select("id, name, area_id")
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .limit(200),
    svc.from("areas")
      .select("id, name")
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .limit(100),
  ]);
  return {
    cycles: cyclesRes.data ?? [],
    teams: teamsRes.data ?? [],
    areas: areasRes.data ?? [],
  };
}

// ---- query_okrs ------------------------------------------------------------
async function queryOkrs(args: Json, ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const level = (args.level as string) ?? "both";
  const cycleId = args.cycle_id as string | undefined;
  const teamId = args.team_id as string | undefined;
  const statusFilter = args.status_filter as string[] | undefined;
  const limit = Math.min(Number(args.limit ?? 200), 400);

  const out: Json = {};

  if (level === "org" || level === "both") {
    let q = svc.from("okr_org_objectives")
      .select("id, title, description, cycle_id, status, progress, owner_user_id")
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .is("cancelled_at", null);
    if (cycleId) q = q.eq("cycle_id", cycleId);
    if (statusFilter?.length) q = q.in("status", statusFilter);
    const { data: orgObjs } = await q.limit(80);
    out.org_objectives = orgObjs ?? [];

    const orgIds = (orgObjs ?? []).map((o) => (o as { id: string }).id);
    if (orgIds.length) {
      const { data: orgKrs } = await svc.from("okr_org_key_results")
        .select("id, title, org_objective_id, baseline, target, current_value, unit, direction, status, owner_user_id")
        .in("org_objective_id", orgIds)
        .is("deleted_at", null)
        .is("cancelled_at", null);
      out.org_key_results = (orgKrs ?? []).map(enrichKrProgress);
    } else {
      out.org_key_results = [];
    }
  }

  if (level === "team" || level === "both") {
    let q = svc.from("okr_team_objectives")
      .select("id, title, description, team_id, cycle_id, status, progress, owner_user_id")
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .is("cancelled_at", null);
    if (cycleId) q = q.eq("cycle_id", cycleId);
    if (teamId) q = q.eq("team_id", teamId);
    if (statusFilter?.length) q = q.in("status", statusFilter);
    const { data: teamObjs } = await q.limit(200);
    out.team_objectives = teamObjs ?? [];

    const teamObjIds = (teamObjs ?? []).map((o) => (o as { id: string }).id);
    if (teamObjIds.length) {
      const { data: teamKrs } = await svc.from("okr_team_key_results")
        .select("id, title, team_objective_id, baseline, target, current_value, unit, direction, status, owner_user_id, responsible_area_id")
        .in("team_objective_id", teamObjIds)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .limit(limit);
      out.team_key_results = (teamKrs ?? []).map(enrichKrProgress);
    } else {
      out.team_key_results = [];
    }
  }

  return out;
}

function enrichKrProgress(kr: Record<string, unknown>): Record<string, unknown> {
  const baseline = Number(kr.baseline ?? 0);
  const target = Number(kr.target ?? 0);
  const current = Number(kr.current_value ?? baseline);
  const direction = (kr.direction as string) ?? "up";
  const unit = (kr.unit as string) ?? "number";
  const pct = calculateKrProgress({
    baseline,
    target,
    current,
    direction: direction as "up" | "down",
    unit,
  });
  return { ...kr, progress_pct: Math.round(pct * 10) / 10 };
}

// ---- query_kpis ------------------------------------------------------------
async function queryKpis(args: Json, ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const areaId = args.area_id as string | undefined;
  const teamId = args.team_id as string | undefined;
  const kpiIds = args.kpi_ids as string[] | undefined;
  const limitKpis = Math.min(Number(args.limit_kpis ?? 100), 200);
  const dateFrom = (args.date_from as string) ?? `${new Date().getFullYear()}-01-01`;
  const dateTo = (args.date_to as string) ?? new Date().toISOString().slice(0, 10);

  let q = svc.from("kpi_metrics")
    .select(
      "id, name, description, unit, direction, target_value, baseline_value, frequency, " +
      "indicator_type, lifecycle_status, area_id, responsible_area_id, team_id, owner_user_id",
    )
    .eq("bu_id", buId)
    .eq("indicator_type", "kpi")
    .eq("lifecycle_status", "active");

  if (areaId) q = q.or(`area_id.eq.${areaId},responsible_area_id.eq.${areaId}`);
  if (teamId) q = q.eq("team_id", teamId);
  if (kpiIds?.length) q = q.in("id", kpiIds);

  const { data: kpis } = await q.limit(limitKpis);
  const ids = (kpis ?? []).map((k) => (k as { id: string }).id);

  let values: unknown[] = [];
  if (ids.length) {
    const { data } = await svc.from("kpi_values")
      .select("kpi_id, reference_date, value, rag_status, confidence")
      .in("kpi_id", ids)
      .gte("reference_date", dateFrom)
      .lte("reference_date", dateTo)
      .order("reference_date", { ascending: true })
      .limit(5000);
    values = data ?? [];
  }

  return { kpis: kpis ?? [], values, date_from: dateFrom, date_to: dateTo };
}

// ---- query_projects --------------------------------------------------------
async function queryProjects(args: Json, ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const statusFilter = args.status_filter as string[] | undefined;
  const teamId = args.team_id as string | undefined;
  const includeMilestones = (args.include_milestones as boolean) ?? true;
  const limit = Math.min(Number(args.limit ?? 80), 200);

  let q = svc.from("projects")
    .select("id, name, description, status, start_date, due_date, owner_id, priority")
    .eq("bu_id", buId)
    .is("deleted_at", null);
  if (statusFilter?.length) q = q.in("status", statusFilter);
  const { data: projects } = await q.limit(limit);

  const out: Json = { projects: projects ?? [] };

  if (includeMilestones && projects?.length) {
    const projectIds = (projects as Array<{ id: string }>).map((p) => p.id);
    const { data: milestones } = await svc.from("project_milestones")
      .select("id, project_id, title, status, due_date, completed_at")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .limit(500);
    out.milestones = milestones ?? [];

    const { data: krLinks } = await svc.from("project_krs")
      .select("project_id, kr_id, kr_type")
      .in("project_id", projectIds);
    out.kr_links = krLinks ?? [];
  }

  // Bonus: link with team via project_teams
  if (teamId && projects?.length) {
    const { data: links } = await svc.from("project_teams")
      .select("project_id, team_id")
      .eq("team_id", teamId);
    const allowed = new Set((links ?? []).map((l) => (l as { project_id: string }).project_id));
    out.projects = (out.projects as Array<{ id: string }>).filter((p) => allowed.has(p.id));
  }

  return out;
}

// ---- query_checkins --------------------------------------------------------
async function queryCheckins(args: Json, ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const dateFrom = (args.date_from as string) ??
    new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const dateTo = (args.date_to as string) ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(Number(args.limit ?? 200), 500);

  const { data } = await svc.from("okr_checkins")
    .select("id, kr_id, current_value, previous_value, confidence, blockers, comments, created_at, user_id, team_id")
    .eq("bu_id", buId)
    .gte("created_at", `${dateFrom}T00:00:00Z`)
    .lte("created_at", `${dateTo}T23:59:59Z`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { checkins: data ?? [], date_from: dateFrom, date_to: dateTo };
}

// ---- query_decisions -------------------------------------------------------
async function queryDecisions(args: Json, ctx: ToolContext): Promise<Json> {
  const { svc, buId } = ctx;
  const limit = Math.min(Number(args.limit ?? 50), 150);

  const { data } = await svc.from("analysis_decisions")
    .select("id, report_id, decisions, created_at, created_by")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { decisions: data ?? [] };
}
