// ============================================================================
// QBR Executive Report — parallel data loader
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
      .eq("wizard_type", "qbr-pre")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed"),
    sc
      .from("okr_wizard_sessions")
      .select("reflection_data")
      .eq("wizard_type", "qbr-pre-clevel")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sc
      .from("kpi_metrics")
      .select(`
        id, name, category, unit, direction, target_value,
        values:kpi_values(value, rag_status, period_label, created_at)
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
    sc
      .from("okr_wizard_sessions")
      .select("reflection_data, wizard_type, team_id, completed_at")
      .eq("cycle_id", cycleId)
      .eq("bu_id", buId)
      .eq("status", "completed")
      .in("wizard_type", ["team-checkin", "mbr", "qbr-pre", "qbr-pre-clevel"]),
  ]);
}
