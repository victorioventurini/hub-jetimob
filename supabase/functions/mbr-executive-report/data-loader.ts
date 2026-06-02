// ============================================================================
// MBR Executive Report — parallel data loader
// ============================================================================

import type { EdgeSupabaseClient } from "../_shared/types/common.ts";

export async function loadCycle(
  sc: EdgeSupabaseClient,
  cycleId: string,
  buId: string,
) {
  return await sc
    .from("cycles")
    .select("id, name, start_date, end_date, type, status")
    .eq("id", cycleId)
    .eq("bu_id", buId)
    .single();
}

/**
 * Carrega dados do mês de referência para o relatório executivo de MBR.
 *
 * NOTA: sessões MBR-pré/MBR são filtradas por `reflection_data->>'referenceMonth'`
 * em JS (depois do fetch) — o operador `->>` em `eq` no PostgREST não suporta
 * direto via SDK quando o campo está aninhado em `data.*`. Como o volume por
 * BU/ciclo é baixo (dezenas), o filtro em JS é seguro.
 */
export async function loadReportData(
  sc: EdgeSupabaseClient,
  cycleId: string,
  buId: string,
  cycleYear: number,
) {
  return await Promise.all([
    sc
      .from("okr_team_objectives")
      .select(`
        id, title, status, team_id,
        key_results:okr_team_key_results(
          id, title, current_value, target, baseline,
          direction, status, unit, deleted_at, cancelled_at
        )
      `)
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .is("cancelled_at", null)
      .neq("status", "cancelled")
      .neq("status", "discarded"),
    sc
      .from("teams")
      .select("id, name")
      .eq("bu_id", buId)
      .is("deleted_at", null),
    sc
      .from("okr_wizard_sessions")
      .select("team_id, reflection_data, completed_at")
      .eq("wizard_type", "mbr-pre")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed"),
    sc
      .from("okr_wizard_sessions")
      .select("team_id, reflection_data, completed_at")
      .eq("wizard_type", "mbr")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed"),
    sc
      .from("kpi_metrics")
      .select(`
        id, name, category, unit, direction, target_value,
        values:kpi_values(value, rag_status, period_label, reference_date, created_at)
      `)
      .eq("bu_id", buId)
      .eq("scope", "org")
      .eq("status", "active")
      .is("deleted_at", null),
    sc
      .from("okr_org_objectives")
      .select(`
        id, title,
        key_results:okr_org_key_results(
          id, title, current_value, target, baseline, direction, status, unit
        )
      `)
      .eq("bu_id", buId)
      .eq("year", cycleYear)
      .is("deleted_at", null)
      .is("cancelled_at", null)
      .neq("status", "cancelled")
      .neq("status", "discarded"),
  ]);
}

/**
 * Carrega o valor efetivo da KPI primária para cada KR informado, considerando
 * leituras até `monthEndIso`. Retorna um Map<krId, effectiveCurrentValue>.
 *
 * Implementa a Core Rule: "Primary KPIs dictate KR progress automatically".
 */
export async function loadPrimaryKpiValuesForKrs(
  sc: EdgeSupabaseClient,
  krIds: string[],
  monthEndIso: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (krIds.length === 0) return map;

  const { data: links, error: linksErr } = await sc
    .from("okr_kr_metrics")
    .select("kr_id, kpi_id")
    .in("kr_id", krIds)
    .eq("role", "primary")
    .is("deleted_at", null);

  if (linksErr || !links || links.length === 0) return map;

  const kpiIds = Array.from(new Set(links.map((l: { kpi_id: string }) => l.kpi_id).filter(Boolean)));
  if (kpiIds.length === 0) return map;

  const { data: values, error: valuesErr } = await sc
    .from("kpi_values")
    .select("kpi_id, value, reference_date")
    .in("kpi_id", kpiIds)
    .lte("reference_date", monthEndIso)
    .order("reference_date", { ascending: false });

  if (valuesErr || !values) return map;

  // Última leitura por kpi_id (já ordenado desc).
  const latestByKpi = new Map<string, number>();
  for (const v of values as Array<{ kpi_id: string; value: number | null }>) {
    if (!v?.kpi_id || latestByKpi.has(v.kpi_id)) continue;
    if (typeof v.value === "number") latestByKpi.set(v.kpi_id, v.value);
  }

  for (const link of links as Array<{ kr_id: string; kpi_id: string }>) {
    const val = latestByKpi.get(link.kpi_id);
    if (typeof val === "number") map.set(link.kr_id, val);
  }
  return map;
}
