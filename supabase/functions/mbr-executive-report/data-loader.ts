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
 * Janela em que aceitamos uma sessão MBR-pré/MBR como pertencente ao
 * `monthRef`: o mês-calendário **seguinte** ao mês analisado. Ex.: para
 * `monthRef='2026-05'`, aceitamos sessões com `completed_at` em jun/2026.
 *
 * Essa regra alinha o relatório executivo à mesma seleção exibida na lista
 * de "Concluídos" da página do rito (`useRitualPreparationStatus`), evitando
 * que sessões com `reflection_data.referenceMonth` errado (snapshot preso ao
 * draft criado no mês anterior) fiquem de fora.
 */
export function ritualSubmissionWindowIso(
  monthRef: string,
): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthRef);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1; // 0-based
  // Mês imediatamente seguinte ao analisado.
  const nextStart = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));
  const nextEnd = new Date(Date.UTC(year, monthIdx + 2, 1, 0, 0, 0) - 1);
  return { start: nextStart.toISOString(), end: nextEnd.toISOString() };
}

/**
 * Carrega dados do mês de referência para o relatório executivo de MBR.
 *
 * Sessões MBR-pré/MBR são filtradas por janela de `completed_at` (mês
 * seguinte ao `monthRef`). Sessões com `reflection_data.referenceMonth`
 * fora dessa janela mas iguais ao `monthRef` ainda podem ser incluídas
 * em uma segunda passada no extractor (compatibilidade).
 */
export async function loadReportData(
  sc: EdgeSupabaseClient,
  cycleId: string,
  buId: string,
  cycleYear: number,
  submissionWindow: { start: string; end: string },
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
      .select("team_id, reflection_data, completed_at, started_by")
      .eq("wizard_type", "mbr-pre")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed")
      .gte("completed_at", submissionWindow.start)
      .lte("completed_at", submissionWindow.end),
    sc
      .from("okr_wizard_sessions")
      .select("team_id, reflection_data, completed_at, started_by")
      .eq("wizard_type", "mbr")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed")
      .gte("completed_at", submissionWindow.start)
      .lte("completed_at", submissionWindow.end),
    sc
      .from("kpi_metrics")
      .select(`
        id, name, category, unit, direction, target_value,
        values:kpi_values(value, rag_status, period_label, reference_date, created_at)
      `)
      .eq("bu_id", buId)
      .eq("scope", "org")
      .eq("status", "active")
      .eq("indicator_type", "kpi")
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
