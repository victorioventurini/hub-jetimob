// Data collection per module for analysis-generate
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import type {
  AnalysisDepth,
  CheckinRow,
  CollectedData,
  GenerateRequest,
  InitiativeRow,
  KpiRow,
  KpiValueRow,
  KpisModule,
  OkrKrRow,
  OkrObjRow,
  OkrsModule,
  PeriodWindow,
  ProjectRow,
  ProjectsModule,
  WizardRow,
} from "./types.ts";

export function periodWindow(period: GenerateRequest["period"], depth: AnalysisDepth): PeriodWindow {
  const now = new Date();
  const to = now.toISOString();
  let fromDate = new Date(now);

  switch (period.type) {
    case "last_30d":
      fromDate.setDate(now.getDate() - 30);
      break;
    case "previous_cycle":
      fromDate.setMonth(now.getMonth() - 6);
      break;
    case "compare_cycles":
      fromDate.setMonth(now.getMonth() - 12);
      break;
    case "current_cycle":
    default:
      fromDate.setMonth(now.getMonth() - 3);
      break;
  }

  if (depth === "minimal") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 7);
  } else if (depth === "full") {
    fromDate = new Date(fromDate);
    fromDate.setMonth(fromDate.getMonth() - 3);
  }
  return { from: fromDate.toISOString(), to };
}

async function collectKpis(svc: EdgeSupabaseClient, buId: string, win: PeriodWindow): Promise<KpisModule> {
  const { data: kpis } = await svc
    .from("kpi_metrics")
    .select("id, name, unit, target_value, direction, scope, created_at")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(50);

  const ids = ((kpis || []) as KpiRow[]).map((k) => k.id);
  let values: KpiValueRow[] = [];
  if (ids.length > 0) {
    const { data } = await svc
      .from("kpi_values")
      .select("kpi_id, reference_date, value, rag_status")
      .in("kpi_id", ids)
      .gte("reference_date", win.from.slice(0, 10))
      .lte("reference_date", win.to.slice(0, 10))
      .order("reference_date", { ascending: false });
    values = (data || []) as KpiValueRow[];
  }
  return { kpis: (kpis || []) as KpiRow[], values };
}

async function collectOkrs(svc: EdgeSupabaseClient, buId: string, scope: GenerateRequest["scope"]): Promise<OkrsModule> {
  let teamObjQuery = svc
    .from("okr_team_objectives")
    .select("id, title, description, team_id, cycle_id, status, progress")
    .eq("bu_id", buId)
    .is("deleted_at", null);
  if (scope.type === "team" && scope.team_id) {
    teamObjQuery = teamObjQuery.eq("team_id", scope.team_id);
  }
  const { data: teamObjectives } = await teamObjQuery.limit(80);

  const objIds = ((teamObjectives || []) as OkrObjRow[]).map((o) => o.id);
  let teamKrs: OkrKrRow[] = [];
  if (objIds.length > 0) {
    const { data } = await svc
      .from("okr_team_key_results")
      .select("id, title, team_objective_id, baseline, target, current_value, unit, status")
      .in("team_objective_id", objIds)
      .is("deleted_at", null);
    teamKrs = (data || []) as OkrKrRow[];
  }

  const { data: orgObjectives } = await svc
    .from("okr_org_objectives")
    .select("id, title, description, cycle_id, status")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(40);

  return {
    teamObjectives: (teamObjectives || []) as OkrObjRow[],
    teamKrs,
    orgObjectives: (orgObjectives || []) as OkrObjRow[],
  };
}

async function collectProjects(
  svc: EdgeSupabaseClient,
  buId: string,
  win: PeriodWindow,
): Promise<ProjectsModule> {
  const { data: projects } = await svc
    .from("projects")
    .select("id, name, description, status, start_date, due_date, owner_id")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .gte("created_at", win.from)
    .limit(80);

  const { data: initiatives } = await svc
    .from("okr_initiatives")
    .select("id, name, status, owner_user_id, kr_id, expected_end_date, progress")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(80);

  return {
    projects: (projects || []) as ProjectRow[],
    initiatives: (initiatives || []) as InitiativeRow[],
  };
}

async function collectCheckins(
  svc: EdgeSupabaseClient,
  buId: string,
  win: PeriodWindow,
): Promise<CheckinRow[]> {
  const { data } = await svc
    .from("okr_checkins")
    .select("id, kr_id, current_value, previous_value, confidence, blockers, comments, created_at, user_id, team_id")
    .eq("bu_id", buId)
    .gte("created_at", win.from)
    .lte("created_at", win.to)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data || []) as CheckinRow[];
}

async function collectWizards(
  svc: EdgeSupabaseClient,
  buId: string,
  win: PeriodWindow,
): Promise<WizardRow[]> {
  const { data } = await svc
    .from("okr_wizard_sessions")
    .select("id, wizard_type, team_id, cycle_id, status, reflection_data, created_at, completed_at")
    .eq("bu_id", buId)
    .gte("created_at", win.from)
    .lte("created_at", win.to)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data || []) as WizardRow[];
}

export async function collectAll(
  svc: EdgeSupabaseClient,
  buId: string,
  modules: string[],
  scope: GenerateRequest["scope"],
  win: PeriodWindow,
): Promise<CollectedData> {
  const tasks: Promise<unknown>[] = [];
  const keys: string[] = [];

  if (modules.includes("kpis")) { keys.push("kpis"); tasks.push(collectKpis(svc, buId, win)); }
  if (modules.includes("okrs")) { keys.push("okrs"); tasks.push(collectOkrs(svc, buId, scope)); }
  if (modules.includes("projects") || modules.includes("initiatives")) {
    keys.push("projects"); tasks.push(collectProjects(svc, buId, win));
  }
  if (modules.includes("checkins")) { keys.push("checkins"); tasks.push(collectCheckins(svc, buId, win)); }
  if (modules.includes("wizards")) { keys.push("wizards"); tasks.push(collectWizards(svc, buId, win)); }

  const results = await Promise.allSettled(tasks);
  const out: CollectedData = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      (out as Record<string, unknown>)[keys[i]] = r.value;
    } else {
      console.warn(`[collect] failed ${keys[i]}:`, r.reason);
    }
  });
  return out;
}

export function buildSources(modules: string[], data: CollectedData) {
  const sources: Array<{ module: string; entityType: string; entityId?: string; label: string }> = [];
  if (modules.includes("kpis") && data.kpis) {
    (data.kpis.kpis || []).slice(0, 10).forEach((k) =>
      sources.push({ module: "kpis", entityType: "kpi", entityId: k.id, label: `KPI: ${k.name}` }),
    );
  }
  if (modules.includes("okrs") && data.okrs) {
    (data.okrs.teamKrs || []).slice(0, 10).forEach((kr) =>
      sources.push({ module: "okrs", entityType: "kr", entityId: kr.id, label: `KR: ${kr.title}` }),
    );
  }
  if (data.projects) {
    (data.projects.projects || []).slice(0, 6).forEach((p) =>
      sources.push({ module: "projects", entityType: "project", entityId: p.id, label: `Projeto: ${p.name}` }),
    );
  }
  if (data.checkins && data.checkins.length > 0) {
    sources.push({ module: "checkins", entityType: "count", label: `${data.checkins.length} check-ins` });
  }
  if (data.wizards && data.wizards.length > 0) {
    sources.push({ module: "wizards", entityType: "count", label: `${data.wizards.length} sessões de ritual` });
  }
  return sources;
}
