/**
 * Agregação de performance de uma pessoa (usada pelas ferramentas MCP).
 *
 * Progresso de KR SEMPRE via `calculateProgress` (SSOT do frontend).
 */
import { calculateProgress } from "../../../modules/okrs/utils/progressCalculation";
import type { OkrDirection } from "../../../modules/okrs/types";
import type { HubScope } from "./context";
import { assertNoError } from "./result";

export interface PersonPerformance {
  pessoa: Record<string, unknown>;
  okrs: { objetivos: unknown[]; key_results: unknown[] };
  checkins_recentes: unknown[];
  kpis: unknown[];
  projetos: { projetos: unknown[]; marcos: unknown[] };
  alertas: string[];
}

const DAY = 24 * 60 * 60 * 1000;

export async function buildPersonPerformance(
  scope: HubScope,
  profileId: string,
): Promise<PersonPerformance> {
  const { supabase, buId } = scope;

  const [
    profileRes,
    objectivesRes,
    krsRes,
    orgKrsRes,
    checkinsRes,
    kpisRes,
    kpiContribRes,
    projectsRes,
    milestonesRes,
    initiativesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, work_email, email, employment_status, work_mode, city, state, start_date, team_id, job_title_id, manager_user_id, user_type",
      )
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("okr_team_objectives")
      .select("id, title, status, health_status, avg_progress, kr_count, team_id, cycle_id, is_shared")
      .eq("bu_id", buId)
      .eq("owner_user_id", profileId)
      .is("deleted_at", null)
      .is("cancelled_at", null),
    supabase
      .from("okr_team_key_results")
      .select(
        "id, title, type, baseline, current_value, target, direction, unit, status, team_id, team_objective_id, last_checkin_at, okr_team_objectives(title, cycle_id)",
      )
      .eq("bu_id", buId)
      .eq("owner_user_id", profileId)
      .is("deleted_at", null)
      .is("cancelled_at", null),
    supabase
      .from("okr_org_key_results")
      .select(
        "id, title, baseline, current_value, target, direction, unit, status, org_objective_id, okr_org_objectives(title, cycle_id)",
      )
      .eq("bu_id", buId)
      .eq("owner_user_id", profileId)
      .is("deleted_at", null)
      .is("cancelled_at", null),
    supabase
      .from("okr_checkins")
      .select("id, kr_id, date, previous_value, current_value, confidence, blockers, comments")
      .eq("bu_id", buId)
      .eq("user_id", profileId)
      .order("date", { ascending: false })
      .limit(15),
    supabase
      .from("kpi_metrics")
      .select(
        "id, name, category, unit, direction, target_value, status, lifecycle_status, consolidation_frequency, update_frequency, team_id, area_id, scope",
      )
      .eq("bu_id", buId)
      .eq("owner_user_id", profileId)
      .is("deleted_at", null),
    supabase
      .from("kpi_data_contributors")
      .select("kpi_id, role, kpi_metrics!inner(id, name, unit, direction, target_value, status, bu_id)")
      .eq("profile_id", profileId),
    supabase
      .from("projects")
      .select("id, name, status, start_date, due_date")
      .eq("bu_id", buId)
      .eq("owner_id", profileId)
      .is("deleted_at", null),
    supabase
      .from("project_milestones")
      .select("id, name, status, due_date, project_id, projects(name)")
      .eq("bu_id", buId)
      .eq("owner_id", profileId)
      .is("deleted_at", null),
    supabase
      .from("okr_initiatives")
      .select("id, name, status, priority, progress, expected_end_date, kr_id")
      .eq("bu_id", buId)
      .eq("owner_user_id", profileId)
      .is("deleted_at", null),
  ]);

  assertNoError(profileRes.error, "o perfil da pessoa");
  assertNoError(objectivesRes.error, "objetivos");
  assertNoError(krsRes.error, "key results");
  assertNoError(projectsRes.error, "projetos");

  const alertas: string[] = [];
  const now = Date.now();

  const krs = (krsRes.data ?? []).map((kr) => {
    const progresso = calculateProgress(
      Number(kr.baseline) || 0,
      Number(kr.current_value) || 0,
      Number(kr.target) || 0,
      ((kr.direction as OkrDirection | null) ?? "up") as OkrDirection,
      { unit: kr.unit as string | null },
    );
    const objetivo = Array.isArray(kr.okr_team_objectives)
      ? kr.okr_team_objectives[0]
      : kr.okr_team_objectives;
    const semCheckin =
      !kr.last_checkin_at || now - new Date(kr.last_checkin_at as string).getTime() > 14 * DAY;
    if (kr.status === "active" && semCheckin) {
      alertas.push(`KR sem check-in recente: ${kr.title}`);
    }
    if (kr.status === "active" && progresso < 40) {
      alertas.push(`KR abaixo de 40%: ${kr.title} (${Math.round(progresso)}%)`);
    }
    return {
      id: kr.id,
      titulo: kr.title,
      tipo: kr.type,
      objetivo: (objetivo as { title?: string } | null)?.title ?? null,
      baseline: kr.baseline,
      resultado: kr.current_value,
      meta: kr.target,
      orientacao: kr.direction,
      unidade: kr.unit,
      status: kr.status,
      progresso_pct: Math.round(progresso),
      ultimo_checkin: kr.last_checkin_at,
    };
  });

  const orgKrs = (orgKrsRes.data ?? []).map((kr) => ({
    id: kr.id,
    titulo: kr.title,
    escopo: "org",
    objetivo: (Array.isArray(kr.okr_org_objectives) ? kr.okr_org_objectives[0] : kr.okr_org_objectives)
      ?.title ?? null,
    resultado: kr.current_value,
    meta: kr.target,
    orientacao: kr.direction,
    unidade: kr.unit,
    status: kr.status,
    progresso_pct: Math.round(
      calculateProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        ((kr.direction as OkrDirection | null) ?? "up") as OkrDirection,
        { unit: kr.unit as string | null },
      ),
    ),
  }));

  const kpiIds = [
    ...(kpisRes.data ?? []).map((k) => k.id as string),
    ...(kpiContribRes.data ?? [])
      .filter((c) => {
        const m = Array.isArray(c.kpi_metrics) ? c.kpi_metrics[0] : c.kpi_metrics;
        return (m as { bu_id?: string } | null)?.bu_id === buId;
      })
      .map((c) => c.kpi_id as string),
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  let ultimosValores: Record<string, { value: number; reference_date: string; input_type: string | null }> = {};
  if (kpiIds.length > 0) {
    const { data: values, error: valuesError } = await supabase
      .from("kpi_values")
      .select("kpi_id, value, reference_date, input_type")
      .in("kpi_id", kpiIds)
      .order("reference_date", { ascending: false })
      .limit(500);
    assertNoError(valuesError, "valores de KPI");
    for (const v of values ?? []) {
      const key = v.kpi_id as string;
      if (!ultimosValores[key]) {
        ultimosValores[key] = {
          value: Number(v.value),
          reference_date: v.reference_date as string,
          input_type: (v.input_type as string | null) ?? null,
        };
      }
    }
  }

  type KpiRow = Record<string, unknown> & { papel: string };
  const kpis: Array<Record<string, unknown>> = [
    ...(kpisRes.data ?? []).map((k) => ({ ...(k as Record<string, unknown>), papel: "responsável" }) as KpiRow),
    ...(kpiContribRes.data ?? [])
      .map((c) => {
        const m = (Array.isArray(c.kpi_metrics) ? c.kpi_metrics[0] : c.kpi_metrics) as
          | Record<string, unknown>
          | null;
        return m && m.bu_id === buId
          ? ({ ...m, papel: `contribuidor (${c.role})` } as KpiRow)
          : null;
      })
      .filter((k): k is KpiRow => !!k),
  ].map((k) => {
    const ultimo = ultimosValores[k.id as string];
    const meta = Number(k.target_value);
    if (ultimo && Number.isFinite(meta) && meta !== 0) {
      const fora = k.direction === "down" ? ultimo.value > meta : ultimo.value < meta;
      if (fora) alertas.push(`KPI fora da meta: ${k.name} (${ultimo.value} vs meta ${meta})`);
    }
    if (!ultimo) alertas.push(`KPI sem nenhum valor lançado: ${k.name}`);
    return {
      id: k.id,
      nome: k.name,
      papel: (k as { papel?: string }).papel,
      unidade: k.unit,
      orientacao: k.direction,
      meta: k.target_value,
      status: k.status,
      periodicidade_consolidacao: (k as { consolidation_frequency?: string }).consolidation_frequency,
      ultimo_valor: ultimo?.value ?? null,
      ultimo_valor_data: ultimo?.reference_date ?? null,
      ultimo_valor_tipo: ultimo?.input_type ?? null,
    };
  });

  const marcos = (milestonesRes.data ?? []).map((m) => {
    const atrasado =
      m.status !== "done" && m.due_date && new Date(m.due_date as string).getTime() < now;
    if (atrasado) alertas.push(`Marco atrasado: ${m.name}`);
    return {
      id: m.id,
      nome: m.name,
      status: m.status,
      prazo: m.due_date,
      atrasado: !!atrasado,
      projeto: (Array.isArray(m.projects) ? m.projects[0] : m.projects)?.name ?? null,
    };
  });

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;

  return {
    pessoa: {
      id: profile.id,
      nome: profile.display_name,
      email: profile.work_email ?? profile.email,
      situacao: profile.employment_status,
      modelo_trabalho: profile.work_mode,
      cidade: profile.city,
      estado: profile.state,
      inicio: profile.start_date,
      tipo: profile.user_type,
      time_id: profile.team_id,
      cargo_id: profile.job_title_id,
      gestor_id: profile.manager_user_id,
      unidade: scope.buName,
    },
    okrs: {
      objetivos: (objectivesRes.data ?? []).map((o) => ({
        id: o.id,
        titulo: o.title,
        status: o.status,
        saude: o.health_status,
        progresso_medio: o.avg_progress,
        qtd_krs: o.kr_count,
        compartilhado: o.is_shared,
      })),
      key_results: [...krs, ...orgKrs],
    },
    checkins_recentes: (checkinsRes.data ?? []).map((c) => ({
      kr_id: c.kr_id,
      data: c.date,
      de: c.previous_value,
      para: c.current_value,
      confianca: c.confidence,
      bloqueios: c.blockers,
      comentarios: c.comments,
    })),
    kpis,
    projetos: {
      projetos: (projectsRes.data ?? []).map((p) => ({
        id: p.id,
        nome: p.name,
        status: p.status,
        inicio: p.start_date,
        prazo: p.due_date,
      })),
      marcos,
    },
    alertas: [
      ...alertas,
      ...((initiativesRes.data ?? [])
        .filter((i) => i.status === "blocked")
        .map((i) => `Iniciativa bloqueada: ${i.name}`)),
    ].filter((a, i, arr) => arr.indexOf(a) === i),
  };
}
