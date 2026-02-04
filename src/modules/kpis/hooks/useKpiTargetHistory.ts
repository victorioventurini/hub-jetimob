import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";

/**
 * v2.86.0: Hook para buscar histórico de alterações de metas de um KPI
 * 
 * Histórico automático registrado pelo trigger trg_kpi_target_history
 * quando target_value ou target_source são alterados.
 */

export interface KpiTargetHistoryEntry {
  id: string;
  kpi_id: string;
  old_target_value: number | null;
  new_target_value: number | null;
  old_target_source: string | null;
  new_target_source: string | null;
  changed_at: string;
  changed_by: string | null;
  changed_by_user?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
}

export interface UseKpiTargetHistoryResult {
  history: KpiTargetHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
}

export function useKpiTargetHistory(kpiId: string | null): UseKpiTargetHistoryResult {
  const supabase = useOptionalBuScopedSupabase();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.targetHistory(kpiId),
    queryFn: async () => {
      if (!supabase || !kpiId) return [];

      const { data, error } = await supabase
        .from("kpi_target_history")
        .select(`
          id,
          kpi_id,
          old_target_value,
          new_target_value,
          old_target_source,
          new_target_source,
          changed_at,
          changed_by,
          changed_by_user:profiles!kpi_target_history_changed_by_fkey(
            id,
            display_name,
            photo_url
          )
        `)
        .eq("kpi_id", kpiId)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((entry) => ({
        ...entry,
        changed_by_user: Array.isArray(entry.changed_by_user) 
          ? entry.changed_by_user[0] 
          : entry.changed_by_user,
      })) as KpiTargetHistoryEntry[];
    },
    enabled: !!supabase && !!kpiId,
  });

  return {
    history: data || [],
    isLoading,
    error: error as Error | null,
  };
}
