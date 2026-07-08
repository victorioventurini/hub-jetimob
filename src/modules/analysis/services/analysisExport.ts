/**
 * Analysis Export Service
 *
 * Coleta os dados de performance da BU ativa (KPIs, OKRs, Projetos) para
 * o período informado. Todas as queries respeitam BU isolation e soft deletes,
 * e listam colunas explicitamente (sem select('*')).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateProgress } from "@/modules/okrs/utils/progressCalculation";

export interface ExportPeriod {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  year: number;
  label: string;
}

export interface ExportPayload {
  bu: { id: string; name: string };
  period: ExportPeriod;
  generatedAt: string;
  generatedBy: string;
  kpis: {
    definitions: KpiDefinitionRow[];
    inputs: KpiInputRow[];
  };
  okrs: {
    cycles: CycleRow[];
    objectives: ObjectiveRow[];
    keyResults: KeyResultRow[];
    checkins: CheckinRow[];
  };
  projects: {
    projects: ProjectRow[];
    milestones: MilestoneRow[];
  };
  overview: OverviewRow[];
}

export interface KpiDefinitionRow {
  id: string;
  nome: string;
  descricao: string | null;
  area: string | null;
  time: string | null;
  responsavel: string | null;
  unidade: string | null;
  direcao: string | null;
  frequencia: string | null;
  tipo_indicador: string | null;
  escopo: string | null;
  meta_ano: number | null;
  status: string | null;
  criado_em: string | null;
}

export interface KpiInputRow {
  kpi_id: string;
  kpi_nome: string;
  data_referencia: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  periodo_label: string | null;
  valor: number | null;
  rag: string | null;
  input_type: string | null;
  origem: string | null;
  observacao: string | null;
  criado_em: string | null;
}

export interface CycleRow {
  id: string;
  nome: string;
  tipo: string | null;
  inicio: string | null;
  fim: string | null;
}

export interface ObjectiveRow {
  id: string;
  nivel: "organizacional" | "time";
  ciclo: string | null;
  time: string | null;
  titulo: string;
  descricao: string | null;
  status: string | null;
  ano: number | null;
  progresso_medio: number;
  criado_em: string | null;
}

export interface KeyResultRow {
  id: string;
  objetivo_id: string;
  objetivo: string;
  nivel: "organizacional" | "time";
  titulo: string;
  unidade: string | null;
  baseline: number | null;
  atual: number | null;
  meta: number | null;
  direcao: string | null;
  progresso_pct: number;
  status: string | null;
  responsavel: string | null;
  kpi_vinculado: string | null;
  ultimo_checkin: string | null;
}

export interface CheckinRow {
  id: string;
  kr_id: string;
  kr_titulo: string;
  data: string | null;
  valor_anterior: number | null;
  valor_atual: number | null;
  confianca: number | null;
  comentario: string | null;
  bloqueios: string | null;
  autor: string | null;
  criado_em: string | null;
}

export interface ProjectRow {
  id: string;
  nome: string;
  descricao: string | null;
  status: string | null;
  saude: string | null;
  progresso_pct: number;
  owner: string | null;
  times: string | null;
  inicio: string | null;
  entrega: string | null;
  krs_vinculados: number;
  krs_titulos: string | null;
  criado_em: string | null;
}

export interface MilestoneRow {
  project_id: string;
  projeto: string;
  id: string;
  nome: string;
  status: string | null;
  inicio: string | null;
  entrega: string | null;
  owner: string | null;
  notas: string | null;
  criado_em: string | null;
}

export interface OverviewRow {
  metrica: string;
  valor: string | number;
}

// ────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────

function nameFrom(map: Map<string, { display_name: string | null }>, id?: string | null) {
  if (!id) return null;
  return map.get(id)?.display_name ?? null;
}

function pct(n: number) {
  return Math.round(n * 10) / 10;
}

// ────────────────────────────────────────────────────────────────
// KPIs
// ────────────────────────────────────────────────────────────────

async function fetchKpis(
  supabase: SupabaseClient,
  buId: string,
  period: ExportPeriod,
): Promise<{ definitions: KpiDefinitionRow[]; inputs: KpiInputRow[] }> {
  const { data: metrics, error } = await supabase
    .from("kpi_metrics")
    .select(
      `id, name, description, unit, direction, frequency, target_value, status,
       indicator_type, scope, area_id, team_id, owner_user_id, created_at,
       area:areas!kpi_metrics_area_id_fkey(id, name),
       team:teams!kpi_metrics_team_id_fkey(id, name),
       owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name)`,
    )
    .eq("bu_id", buId)
    .is("deleted_at", null);
  if (error) throw error;

  const kpiRows = (metrics ?? []) as any[];
  const kpiById = new Map<string, string>();
  const definitions: KpiDefinitionRow[] = kpiRows.map((k) => {
    kpiById.set(k.id, k.name);
    return {
      id: k.id,
      nome: k.name,
      descricao: k.description ?? null,
      area: k.area?.name ?? null,
      time: k.team?.name ?? null,
      responsavel: k.owner?.display_name ?? null,
      unidade: k.unit ?? null,
      direcao: k.direction ?? null,
      frequencia: k.frequency ?? null,
      tipo_indicador: k.indicator_type ?? null,
      escopo: k.scope ?? null,
      meta_ano: k.target_value ?? null,
      status: k.status ?? null,
      criado_em: k.created_at ?? null,
    };
  });

  let inputs: KpiInputRow[] = [];
  if (kpiRows.length > 0) {
    const { data: values, error: vErr } = await supabase
      .from("kpi_values")
      .select(
        `id, kpi_id, value, reference_date, period_start, period_end, period_label,
         rag_status, input_type, source, notes, created_at`,
      )
      .in(
        "kpi_id",
        kpiRows.map((k) => k.id),
      )
      .gte("reference_date", period.start)
      .lte("reference_date", period.end)
      .order("reference_date", { ascending: true });
    if (vErr) throw vErr;
    inputs = (values ?? []).map((v: any) => ({
      kpi_id: v.kpi_id,
      kpi_nome: kpiById.get(v.kpi_id) ?? "",
      data_referencia: v.reference_date ?? null,
      periodo_inicio: v.period_start ?? null,
      periodo_fim: v.period_end ?? null,
      periodo_label: v.period_label ?? null,
      valor: v.value ?? null,
      rag: v.rag_status ?? null,
      input_type: v.input_type ?? null,
      origem: v.source ?? null,
      observacao: v.notes ?? null,
      criado_em: v.created_at ?? null,
    }));
  }

  return { definitions, inputs };
}

// ────────────────────────────────────────────────────────────────
// OKRs
// ────────────────────────────────────────────────────────────────

async function fetchOkrs(
  supabase: SupabaseClient,
  buId: string,
  period: ExportPeriod,
): Promise<{
  cycles: CycleRow[];
  objectives: ObjectiveRow[];
  keyResults: KeyResultRow[];
  checkins: CheckinRow[];
}> {
  const yearStart = `${period.year}-01-01`;
  const yearEnd = `${period.year}-12-31`;

  const { data: cycles, error: cErr } = await supabase
    .from("cycles")
    .select("id, name, type, start_date, end_date")
    .eq("bu_id", buId)
    .gte("start_date", yearStart)
    .lte("start_date", yearEnd)
    .order("start_date", { ascending: true });
  if (cErr) throw cErr;

  const cycleRows: CycleRow[] = (cycles ?? []).map((c: any) => ({
    id: c.id,
    nome: c.name,
    tipo: c.type ?? null,
    inicio: c.start_date ?? null,
    fim: c.end_date ?? null,
  }));
  const cycleNameById = new Map(cycleRows.map((c) => [c.id, c.nome]));

  // ── team objectives + team KRs ──
  const { data: teamObjs, error: toErr } = await supabase
    .from("okr_team_objectives")
    .select(
      `id, team_id, cycle_id, title, description, year, status, created_at,
       team:teams!okr_team_objectives_team_id_fkey(id, name),
       key_results:okr_team_key_results(
         id, team_objective_id, title, baseline, current_value, target, direction,
         unit, status, owner_user_id, last_checkin_at, cancelled_at, deleted_at,
         owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name)
       )`,
    )
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .is("cancelled_at", null)
    .in("cycle_id", cycleRows.map((c) => c.id).length ? cycleRows.map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"]);
  if (toErr) throw toErr;

  // ── org objectives + org KRs ──
  const { data: orgObjs, error: ooErr } = await supabase
    .from("okr_org_objectives")
    .select(
      `id, title, description, year, status, created_at,
       key_results:okr_org_key_results(
         id, org_objective_id, title, baseline, current_value, target, direction,
         unit, status, owner_user_id, cancelled_at, deleted_at,
         owner:profiles!okr_org_key_results_owner_profile_fkey(id, display_name)
       )`,
    )
    .eq("bu_id", buId)
    .eq("year", period.year)
    .is("deleted_at", null)
    .is("cancelled_at", null);
  if (ooErr) throw ooErr;

  const objectives: ObjectiveRow[] = [];
  const keyResults: KeyResultRow[] = [];
  const allKrIds: string[] = [];

  for (const o of (teamObjs ?? []) as any[]) {
    const krs = ((o.key_results ?? []) as any[]).filter((k) => !k.deleted_at && !k.cancelled_at);
    const progresses = krs.map((k) =>
      calculateProgress(
        Number(k.baseline) || 0,
        Number(k.current_value) || 0,
        Number(k.target) || 0,
        (k.direction as any) || "up",
        { unit: k.unit ?? undefined },
      ),
    );
    const avg = progresses.length ? progresses.reduce((a, b) => a + b, 0) / progresses.length : 0;
    objectives.push({
      id: o.id,
      nivel: "time",
      ciclo: cycleNameById.get(o.cycle_id) ?? null,
      time: o.team?.name ?? null,
      titulo: o.title,
      descricao: o.description ?? null,
      status: o.status ?? null,
      ano: o.year ?? null,
      progresso_medio: pct(avg),
      criado_em: o.created_at ?? null,
    });
    krs.forEach((k, i) => {
      keyResults.push({
        id: k.id,
        objetivo_id: o.id,
        objetivo: o.title,
        nivel: "time",
        titulo: k.title,
        unidade: k.unit ?? null,
        baseline: k.baseline ?? null,
        atual: k.current_value ?? null,
        meta: k.target ?? null,
        direcao: k.direction ?? null,
        progresso_pct: pct(progresses[i] ?? 0),
        status: k.status ?? null,
        responsavel: k.owner?.display_name ?? null,
        ultimo_checkin: k.last_checkin_at ?? null,
      });
      allKrIds.push(k.id);
    });
  }

  for (const o of (orgObjs ?? []) as any[]) {
    const krs = ((o.key_results ?? []) as any[]).filter((k) => !k.deleted_at && !k.cancelled_at);
    const progresses = krs.map((k) =>
      calculateProgress(
        Number(k.baseline) || 0,
        Number(k.current_value) || 0,
        Number(k.target) || 0,
        (k.direction as any) || "up",
        { unit: k.unit ?? undefined },
      ),
    );
    const avg = progresses.length ? progresses.reduce((a, b) => a + b, 0) / progresses.length : 0;
    objectives.push({
      id: o.id,
      nivel: "organizacional",
      ciclo: null,
      time: null,
      titulo: o.title,
      descricao: o.description ?? null,
      status: o.status ?? null,
      ano: o.year ?? null,
      progresso_medio: pct(avg),
      criado_em: o.created_at ?? null,
    });
    krs.forEach((k, i) => {
      keyResults.push({
        id: k.id,
        objetivo_id: o.id,
        objetivo: o.title,
        nivel: "organizacional",
        titulo: k.title,
        unidade: k.unit ?? null,
        baseline: k.baseline ?? null,
        atual: k.current_value ?? null,
        meta: k.target ?? null,
        direcao: k.direction ?? null,
        progresso_pct: pct(progresses[i] ?? 0),
        status: k.status ?? null,
        responsavel: k.owner?.display_name ?? null,
        ultimo_checkin: null,
      });
      allKrIds.push(k.id);
    });
  }

  // ── check-ins ──
  let checkins: CheckinRow[] = [];
  if (allKrIds.length > 0) {
    const krTitleById = new Map(keyResults.map((k) => [k.id, k.titulo]));
    const { data: ck, error: ckErr } = await supabase
      .from("okr_checkins")
      .select(
        "id, kr_id, date, previous_value, current_value, confidence, comments, blockers, created_at, user_id",
      )
      .in("kr_id", allKrIds)
      .gte("date", period.start)
      .lte("date", period.end)
      .order("date", { ascending: true });
    if (ckErr) throw ckErr;

    const userIds = Array.from(new Set((ck ?? []).map((c: any) => c.user_id).filter(Boolean)));
    let userMap = new Map<string, { display_name: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      userMap = new Map((profiles ?? []).map((p: any) => [p.id, { display_name: p.display_name }]));
    }

    checkins = (ck ?? []).map((c: any) => ({
      id: c.id,
      kr_id: c.kr_id,
      kr_titulo: krTitleById.get(c.kr_id) ?? "",
      data: c.date ?? null,
      valor_anterior: c.previous_value ?? null,
      valor_atual: c.current_value ?? null,
      confianca: c.confidence ?? null,
      comentario: c.comments ?? null,
      bloqueios: c.blockers ?? null,
      autor: nameFrom(userMap, c.user_id),
      criado_em: c.created_at ?? null,
    }));
  }

  return { cycles: cycleRows, objectives, keyResults, checkins };
}

// ────────────────────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────────────────────

async function fetchProjects(
  supabase: SupabaseClient,
  buId: string,
): Promise<{ projects: ProjectRow[]; milestones: MilestoneRow[] }> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, name, description, status, start_date, due_date, owner_id, created_at,
       owner:profiles!projects_owner_id_fkey(id, display_name),
       project_teams(teams:teams!project_teams_team_id_fkey(id, name)),
       project_krs(key_result_id, org_key_result_id),
       project_milestones(id, name, status, start_date, due_date, owner_id, notes, created_at, deleted_at)`,
    )
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const projects: ProjectRow[] = [];
  const milestones: MilestoneRow[] = [];

  for (const p of (data ?? []) as any[]) {
    const ms = ((p.project_milestones ?? []) as any[]).filter((m) => !m.deleted_at);
    const done = ms.filter((m) => m.status === "done" || m.status === "completed").length;
    const progresso = ms.length ? (done / ms.length) * 100 : 0;
    const now = new Date();
    let saude: "on_track" | "at_risk" | "off_track" = "on_track";
    for (const m of ms) {
      if (m.status === "done" || m.status === "completed") continue;
      if (m.due_date && new Date(m.due_date) < now) {
        saude = "off_track";
        break;
      }
      if (m.due_date) {
        const diffDays = (new Date(m.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) saude = saude === "off_track" ? "off_track" : "at_risk";
      }
    }
    const teams = ((p.project_teams ?? []) as any[])
      .map((pt) => pt.teams?.name)
      .filter(Boolean)
      .join(", ");
    projects.push({
      id: p.id,
      nome: p.name,
      descricao: p.description ?? null,
      status: p.status ?? null,
      saude,
      progresso_pct: pct(progresso),
      owner: p.owner?.display_name ?? null,
      times: teams || null,
      inicio: p.start_date ?? null,
      entrega: p.due_date ?? null,
      krs_vinculados: ((p.project_krs ?? []) as any[]).length,
      criado_em: p.created_at ?? null,
    });
    for (const m of ms) {
      milestones.push({
        project_id: p.id,
        projeto: p.name,
        id: m.id,
        nome: m.name,
        status: m.status ?? null,
        inicio: m.start_date ?? null,
        entrega: m.due_date ?? null,
        owner_id: m.owner_id ?? null,
        notas: m.notes ?? null,
        criado_em: m.created_at ?? null,
      });
    }
  }

  return { projects, milestones };
}

// ────────────────────────────────────────────────────────────────
// Overview
// ────────────────────────────────────────────────────────────────

function buildOverview(payload: Omit<ExportPayload, "overview">): OverviewRow[] {
  const kpiCount = payload.kpis.definitions.length;
  const kpiInputs = payload.kpis.inputs.length;
  const ragCounts = payload.kpis.inputs.reduce(
    (acc, i) => {
      const r = (i.rag ?? "").toLowerCase();
      if (r === "green" || r === "on_track") acc.green += 1;
      else if (r === "yellow" || r === "at_risk") acc.yellow += 1;
      else if (r === "red" || r === "off_track") acc.red += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );
  const objCount = payload.okrs.objectives.length;
  const krCount = payload.okrs.keyResults.length;
  const okrAvg = payload.okrs.keyResults.length
    ? payload.okrs.keyResults.reduce((a, k) => a + (k.progresso_pct || 0), 0) /
      payload.okrs.keyResults.length
    : 0;
  const projCount = payload.projects.projects.length;
  const projHealth = payload.projects.projects.reduce(
    (acc, p) => {
      if (p.saude === "on_track") acc.on += 1;
      else if (p.saude === "at_risk") acc.risk += 1;
      else if (p.saude === "off_track") acc.off += 1;
      return acc;
    },
    { on: 0, risk: 0, off: 0 },
  );

  return [
    { metrica: "BU", valor: payload.bu.name },
    { metrica: "Período", valor: `${payload.period.label} (${payload.period.start} → ${payload.period.end})` },
    { metrica: "Gerado em", valor: payload.generatedAt },
    { metrica: "Gerado por", valor: payload.generatedBy },
    { metrica: "— KPIs —", valor: "" },
    { metrica: "Total de KPIs ativos", valor: kpiCount },
    { metrica: "Total de inputs no período", valor: kpiInputs },
    { metrica: "Inputs no verde", valor: ragCounts.green },
    { metrica: "Inputs em atenção", valor: ragCounts.yellow },
    { metrica: "Inputs no vermelho", valor: ragCounts.red },
    { metrica: "— OKRs —", valor: "" },
    { metrica: "Ciclos no ano", valor: payload.okrs.cycles.length },
    { metrica: "Objetivos", valor: objCount },
    { metrica: "Key Results", valor: krCount },
    { metrica: "Progresso médio dos KRs (%)", valor: pct(okrAvg) },
    { metrica: "Check-ins no período", valor: payload.okrs.checkins.length },
    { metrica: "— Projetos —", valor: "" },
    { metrica: "Total de projetos ativos", valor: projCount },
    { metrica: "No prazo", valor: projHealth.on },
    { metrica: "Em atenção", valor: projHealth.risk },
    { metrica: "Atrasados", valor: projHealth.off },
    { metrica: "Milestones no total", valor: payload.projects.milestones.length },
  ];
}

// ────────────────────────────────────────────────────────────────
// public
// ────────────────────────────────────────────────────────────────

export async function collectAnalysisExport(params: {
  supabase: SupabaseClient;
  bu: { id: string; name: string };
  period: ExportPeriod;
  generatedBy: string;
}): Promise<ExportPayload> {
  const [{ definitions, inputs }, okrs, projects] = await Promise.all([
    fetchKpis(params.supabase, params.bu.id, params.period),
    fetchOkrs(params.supabase, params.bu.id, params.period),
    fetchProjects(params.supabase, params.bu.id),
  ]);

  const base: Omit<ExportPayload, "overview"> = {
    bu: params.bu,
    period: params.period,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy,
    kpis: { definitions, inputs },
    okrs,
    projects: { projects: projects.projects, milestones: projects.milestones },
  };

  return { ...base, overview: buildOverview(base) };
}
