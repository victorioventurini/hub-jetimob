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
          direction, status, deleted_at, cancelled_at
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
          id, title, current_value, target, baseline, direction, status
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
