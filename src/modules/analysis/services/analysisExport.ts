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
    initiatives: InitiativeRow[];
  };
  projects: {
    projects: ProjectRow[];
    milestones: MilestoneRow[];
    evolution: ProjectEvolutionRow[];
  };
  overview: OverviewRow[];
  readme: string[];
  metodologia: string[];
}

export interface InitiativeRow {
  id: string;
  kr_id: string;
  kr_titulo: string;
  objetivo: string;
  time: string | null;
  nome: string;
  descricao: string | null;
  status: string | null;
  prioridade: string | null;
  progresso_pct: number | null;
  responsavel: string | null;
  inicio: string | null;
  entrega: string | null;
  notas: string | null;
  criado_em: string | null;
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
  area: string | null;
  time: string | null;
  responsavel: string | null;
  unidade: string | null;
  direcao: string | null;
  frequencia: string | null;
  meta_ano: number | null;
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
  time: string | null;
  ciclo: string | null;
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
  iniciativas_total: number;
  iniciativas_concluidas: number;
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

export interface ProjectEvolutionRow {
  project_id: string;
  projeto: string;
  mes: string; // YYYY-MM
  milestones_totais: number;
  milestones_concluidos: number;
  progresso_pct: number;
  status_projeto: string | null;
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
  const kpiById = new Map<string, KpiDefinitionRow>();
  const definitions: KpiDefinitionRow[] = kpiRows.map((k) => {
    const row: KpiDefinitionRow = {
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
    kpiById.set(k.id, row);
    return row;
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
      .order("kpi_id", { ascending: true })
      .order("reference_date", { ascending: true });
    if (vErr) throw vErr;
    inputs = (values ?? []).map((v: any) => {
      const def = kpiById.get(v.kpi_id);
      return {
        kpi_id: v.kpi_id,
        kpi_nome: def?.nome ?? "",
        area: def?.area ?? null,
        time: def?.time ?? null,
        responsavel: def?.responsavel ?? null,
        unidade: def?.unidade ?? null,
        direcao: def?.direcao ?? null,
        frequencia: def?.frequencia ?? null,
        meta_ano: def?.meta_ano ?? null,
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
      };
    });
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
  initiatives: InitiativeRow[];
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
         unit, status, owner_user_id, metric_id, last_checkin_at, cancelled_at, deleted_at,
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
        time: o.team?.name ?? null,
        ciclo: cycleNameById.get(o.cycle_id) ?? null,
        titulo: k.title,
        unidade: k.unit ?? null,
        baseline: k.baseline ?? null,
        atual: k.current_value ?? null,
        meta: k.target ?? null,
        direcao: k.direction ?? null,
        progresso_pct: pct(progresses[i] ?? 0),
        status: k.status ?? null,
        responsavel: k.owner?.display_name ?? null,
        kpi_vinculado: k.metric_id ?? null,
        ultimo_checkin: k.last_checkin_at ?? null,
        iniciativas_total: 0,
        iniciativas_concluidas: 0,
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
        time: null,
        ciclo: null,
        titulo: k.title,
        unidade: k.unit ?? null,
        baseline: k.baseline ?? null,
        atual: k.current_value ?? null,
        meta: k.target ?? null,
        direcao: k.direction ?? null,
        progresso_pct: pct(progresses[i] ?? 0),
        status: k.status ?? null,
        responsavel: k.owner?.display_name ?? null,
        kpi_vinculado: null,
        ultimo_checkin: null,
        iniciativas_total: 0,
        iniciativas_concluidas: 0,
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

  // ── initiatives (só existem para team KRs) ──
  const teamKrIds = keyResults.filter((k) => k.nivel === "time").map((k) => k.id);
  let initiatives: InitiativeRow[] = [];
  if (teamKrIds.length > 0) {
    const { data: inis, error: iErr } = await supabase
      .from("okr_initiatives")
      .select(
        "id, kr_id, name, description, status, priority, progress, owner_user_id, start_date, expected_end_date, notes, created_at",
      )
      .in("kr_id", teamKrIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;

    const iniOwnerIds = Array.from(
      new Set(((inis ?? []) as any[]).map((i) => i.owner_user_id).filter(Boolean)),
    );
    let iniOwnerMap = new Map<string, { display_name: string | null }>();
    if (iniOwnerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", iniOwnerIds);
      iniOwnerMap = new Map((profs ?? []).map((p: any) => [p.id, { display_name: p.display_name }]));
    }

    const krIndex = new Map(keyResults.map((k) => [k.id, k]));
    initiatives = ((inis ?? []) as any[]).map((i) => {
      const kr = krIndex.get(i.kr_id);
      return {
        id: i.id,
        kr_id: i.kr_id,
        kr_titulo: kr?.titulo ?? "",
        objetivo: kr?.objetivo ?? "",
        time: kr?.time ?? null,
        nome: i.name,
        descricao: i.description ?? null,
        status: i.status ?? null,
        prioridade: i.priority ?? null,
        progresso_pct: i.progress ?? null,
        responsavel: nameFrom(iniOwnerMap, i.owner_user_id),
        inicio: i.start_date ?? null,
        entrega: i.expected_end_date ?? null,
        notas: i.notes ?? null,
        criado_em: i.created_at ?? null,
      } satisfies InitiativeRow;
    });

    // enriquecer KRs com contagem de iniciativas
    const countByKr = new Map<string, { total: number; done: number }>();
    for (const i of initiatives) {
      const c = countByKr.get(i.kr_id) ?? { total: 0, done: 0 };
      c.total += 1;
      if (i.status === "completed") c.done += 1;
      countByKr.set(i.kr_id, c);
    }
    for (const kr of keyResults) {
      const c = countByKr.get(kr.id);
      if (c) {
        kr.iniciativas_total = c.total;
        kr.iniciativas_concluidas = c.done;
      }
    }
  }

  return { cycles: cycleRows, objectives, keyResults, checkins, initiatives };
}

// ────────────────────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────────────────────

async function fetchProjects(
  supabase: SupabaseClient,
  buId: string,
  period: ExportPeriod,
): Promise<{
  projects: ProjectRow[];
  milestones: MilestoneRow[];
  evolution: ProjectEvolutionRow[];
  projectKrLinks: Array<{ project_id: string; kr_id: string; kind: "team" | "org" }>;
}> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, name, description, status, start_date, due_date, owner_id, created_at,
       owner:profiles!projects_owner_id_fkey(id, display_name),
       project_teams(teams:teams!project_teams_team_id_fkey(id, name)),
       project_krs(
         key_result_id, org_key_result_id,
         team_kr:okr_team_key_results!project_krs_key_result_id_fkey(id, title),
         org_kr:okr_org_key_results!project_krs_org_key_result_id_fkey(id, title)
       ),
       project_milestones(id, name, status, start_date, due_date, owner_id, notes, created_at, updated_at, deleted_at)`,
    )
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const projects: ProjectRow[] = [];
  const milestones: MilestoneRow[] = [];
  const projectKrLinks: Array<{ project_id: string; kr_id: string; kind: "team" | "org" }> = [];

  // resolver donos dos milestones
  const ownerIds = new Set<string>();
  for (const p of (data ?? []) as any[]) {
    for (const m of (p.project_milestones ?? []) as any[]) {
      if (m.owner_id) ownerIds.add(m.owner_id);
    }
  }
  let ownerMap = new Map<string, { display_name: string | null }>();
  if (ownerIds.size) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(ownerIds));
    ownerMap = new Map((profs ?? []).map((p: any) => [p.id, { display_name: p.display_name }]));
  }

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
    const krLinks = (p.project_krs ?? []) as any[];
    const krTitles = krLinks
      .map((pk) => pk.team_kr?.title ?? pk.org_kr?.title)
      .filter(Boolean) as string[];
    for (const pk of krLinks) {
      if (pk.key_result_id) projectKrLinks.push({ project_id: p.id, kr_id: pk.key_result_id, kind: "team" });
      if (pk.org_key_result_id) projectKrLinks.push({ project_id: p.id, kr_id: pk.org_key_result_id, kind: "org" });
    }
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
      krs_vinculados: krLinks.length,
      krs_titulos: krTitles.length ? krTitles.join(" • ") : null,
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
        owner: nameFrom(ownerMap, m.owner_id),
        notas: m.notes ?? null,
        criado_em: m.created_at ?? null,
      });
    }
  }

  // ── evolução mensal derivada do histórico de milestones ──
  // Para cada mês entre period.start e min(period.end, hoje), calcula:
  //   total = milestones criados até o fim do mês
  //   concluídos = milestones done/completed cujo updated_at ≤ fim do mês (aproximação da data de conclusão)
  // Observação: não persistimos completed_at no milestone; usamos updated_at como melhor proxy.
  const evolution: ProjectEvolutionRow[] = [];
  const startDate = new Date(period.start + "T00:00:00Z");
  const endCap = new Date(Math.min(new Date(period.end + "T00:00:00Z").getTime(), Date.now()));
  const months: Array<{ key: string; end: Date }> = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (cursor <= endCap) {
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59));
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ key, end: monthEnd > endCap ? endCap : monthEnd });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const p of (data ?? []) as any[]) {
    const ms = ((p.project_milestones ?? []) as any[]).filter((m) => !m.deleted_at);
    if (ms.length === 0) continue;
    for (const { key, end } of months) {
      const endMs = end.getTime();
      const total = ms.filter((m) => new Date(m.created_at).getTime() <= endMs).length;
      const doneCount = ms.filter(
        (m) =>
          (m.status === "done" || m.status === "completed") &&
          new Date(m.updated_at ?? m.created_at).getTime() <= endMs,
      ).length;
      if (total === 0) continue;
      evolution.push({
        project_id: p.id,
        projeto: p.name,
        mes: key,
        milestones_totais: total,
        milestones_concluidos: doneCount,
        progresso_pct: pct((doneCount / total) * 100),
        status_projeto: p.status ?? null,
      });
    }
  }

  return { projects, milestones, evolution, projectKrLinks };
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
    fetchProjects(params.supabase, params.bu.id, params.period),
  ]);

  // enrichment: resolver nome do KPI vinculado em cada KR (o service armazena o metric_id em kpi_vinculado)
  const kpiNameById = new Map(definitions.map((k) => [k.id, k.nome]));
  const enrichedKrs = okrs.keyResults.map((kr) => ({
    ...kr,
    kpi_vinculado: kr.kpi_vinculado ? kpiNameById.get(kr.kpi_vinculado) ?? null : null,
  }));

  const base: Omit<ExportPayload, "overview"> = {
    bu: params.bu,
    period: params.period,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy,
    kpis: { definitions, inputs },
    okrs: { ...okrs, keyResults: enrichedKrs },
    projects: {
      projects: projects.projects,
      milestones: projects.milestones,
      evolution: projects.evolution,
    },
    readme: buildReadme(params.bu.name, params.period),
    metodologia: buildMetodologia(),
  };

  return { ...base, overview: buildOverview(base) };
}

// ────────────────────────────────────────────────────────────────
// Contexto textual (para o Claude entender o dataset)
// ────────────────────────────────────────────────────────────────

function buildReadme(buName: string, period: ExportPeriod): string[] {
  return [
    `Exportação de performance — ${buName}`,
    `Período: ${period.label} (${period.start} → ${period.end})`,
    ``,
    `O QUE ESTE ARQUIVO CONTÉM`,
    `Uma planilha com os dados operacionais da Business Unit no período. Cada aba é uma tabela relacional simples; os IDs (UUID) permitem cruzar as abas entre si. As duas primeiras abas ("README" e "Metodologia") são texto — leia-as antes de interpretar os números.`,
    ``,
    `COMO AS ABAS SE CONECTAM`,
    `• "KPIs — Inputs" refere-se a "KPIs — Definições" pela coluna KPI (ID).`,
    `• "OKRs — Objetivos" traz o nível (organizacional/time), o Time responsável (quando de time) e o Ciclo. "OKRs — KRs" herda esses campos para permitir agrupar KRs por time ou pela organização toda sem cruzar tabelas.`,
    `• "OKRs — Check-ins" refere-se a "OKRs — KRs" pela coluna KR (ID). Cada check-in é uma atualização semanal do valor atual do KR feita pelo responsável — juntos formam a evolução histórica de cada KR no período.`,
    `• "OKRs — Iniciativas" é o "como" de cada KR de time (projetos leves/tarefas que o time executa para mover o KR). Cada iniciativa aponta para um KR (kr_id) e traz status, prioridade, progresso, responsável e prazos. Nas linhas de "OKRs — KRs" há as colunas "Iniciativas (total)" e "Iniciativas (concluídas)" pré-agregadas.`,
    `• "Projetos" declara em "KRs vinculados (títulos)" quais Key Results o projeto pretende mover. "Projetos — Milestones" é filho de Projetos pelo campo Projeto (ID). Projetos ≠ Iniciativas: projetos são iniciativas grandes/multi-time gerenciadas no módulo de projetos; iniciativas de OKR são leves e vivem sob um KR.`,
    `• "Projetos — Evolução" é a série temporal de progresso de cada projeto (uma linha por mês por projeto). Progresso do mês = milestones concluídos até o fim daquele mês / milestones existentes até o fim daquele mês. Como não persistimos data de conclusão do milestone, usamos updated_at como aproximação — para milestones concluídos há muito tempo isso é preciso; para milestones editados após concluir, a data reflete a última edição. Trate a curva como direcional, não contábil.`,
    ``,
    `COMO INTERPRETAR OS STATUS`,
    `RAG dos inputs de KPI: green = dentro/acima da meta do período; yellow = em atenção; red = abaixo. O corte é feito pelas gates definidas no KPI.`,
    `Status de KR: green (>=70% de progresso), yellow (40–70%), red (<40%). O campo "Progresso (%)" é calculado por (atual − baseline) / (meta − baseline) e NÃO é limitado a 100% — valores acima indicam superação da meta. Valores negativos indicam regressão em relação ao baseline.`,
    `Direção do KR: "up" = maior é melhor; "down" = menor é melhor (ex.: churn, custo). O cálculo de progresso já considera a direção.`,
    `Saúde do projeto: on_track (todos os milestones em dia), at_risk (algum milestone com prazo em menos de 7 dias), off_track (algum milestone com prazo vencido).`,
    ``,
    `AVISOS IMPORTANTES`,
    `• Objetivos e KRs com status "cancelled" ou soft-deleted NÃO estão nesta exportação.`,
    `• Um valor de "Progresso (%)" muito alto (ex.: 500%) geralmente indica meta subdimensionada, não erro nos dados.`,
    `• A aba "Overview" já traz agregados; use-a como bússola antes de mergulhar nas outras.`,
    `• "OKRs — Ciclos" mostra os trimestres/semestres do ano; a coluna Ciclo em "Objetivos" liga o objetivo ao ciclo correspondente.`,
    ``,
    `PROMPT SUGERIDO PARA A ANÁLISE`,
    `Cole exatamente:`,
    ``,
    `"Analise o desempenho da Business Unit ${buName} no período ${period.label} com base neste arquivo. Antes de responder:`,
    `1) Leia as abas 'README' e 'Metodologia'.`,
    `2) Comece por 'Overview' para ter o panorama.`,
    `3) Em KPIs: aponte os 3 indicadores com pior tendência (série de inputs mensais decrescente ou RAG vermelho recorrente) e os 3 melhores.`,
    `4) Em OKRs: liste os objetivos com progresso médio abaixo de 50% e aponte quais KRs deles estão parados (sem check-in há mais de 21 dias). Destaque também KRs cujo progresso supera 150% — provável meta subdimensionada.`,
    `5) Em Projetos: liste projetos off_track e projetos at_risk com seus milestones em atraso. Cruze com 'KRs vinculados (títulos)' para dizer quais OKRs esses projetos afetam.`,
    `6) Termine com 3 recomendações acionáveis para o próximo ciclo, priorizadas por impacto x esforço."`,
  ];
}

function buildMetodologia(): string[] {
  return [
    `Metodologia — como este dataset foi construído`,
    ``,
    `FRAMEWORK OKR`,
    `Objetivo (O) → Key Results (KRs) → Check-ins semanais → Iniciativas/Projetos que movem os KRs.`,
    `Existem dois níveis: Organizacional (BU inteira, campo Ano) e Time (por trimestre, campo Ciclo). Objetivos de time podem estar vinculados a um objetivo organizacional (herança).`,
    `Cada KR tem: baseline (ponto de partida), meta (target), atual (current_value), unidade e direção (up/down). O progresso é sempre calculado pela fórmula canônica; NÃO há teto de 100%.`,
    `Check-ins registram valor anterior, valor atual, confiança (low/medium/high), comentários e bloqueios.`,
    ``,
    `FRAMEWORK KPI`,
    `KPI é uma métrica operacional recorrente, independente do ciclo OKR. Cada KPI tem: unidade, direção, frequência (weekly/monthly/quarterly), tipo (kpi/north_star/guardrail) e escopo (bu/area/team).`,
    `Meta anual (target_value) é a referência para o ano; RAG de cada input é calculado contra a meta do período. "primary_kpi" é um KPI que também alimenta automaticamente um KR — quando existe, a coluna "KPI vinculado" na aba de KRs indica o nome.`,
    `Inputs (aba "KPIs — Inputs") são as medições em cada janela (mensal/semanal). Origin pode ser manual, integração ou consolidado.`,
    ``,
    `PROJETOS`,
    `Um projeto tem status (planned/active/paused/done/cancelled), owner, times participantes e uma lista de milestones ordenados. O "Progresso (%)" é a fração de milestones concluídos. A "Saúde" olha para os milestones em aberto: se algum já venceu, off_track; se algum vence em <7 dias, at_risk; caso contrário, on_track.`,
    `Um projeto pode declarar KRs que pretende mover (coluna "KRs vinculados (títulos)"); essa é a ponte formal entre execução (projeto) e estratégia (OKR).`,
    ``,
    `RESPEITO ÀS REGRAS DE DADOS`,
    `Todas as tabelas são filtradas pela BU ativa (bu_id) e excluem registros soft-deleted. Objetivos/KRs cancelados também são omitidos.`,
  ];
}

