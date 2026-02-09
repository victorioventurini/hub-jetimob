/**
 * Hook to fetch KPI dashboard summary data
 * Supports admin/leader/collaborator scopes with RAG counters, pending updates, and top critical KPIs
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { KpiDashboardSummary } from "../types";

export type KpiDashboardScope = 'admin' | 'leader' | 'collaborator';

interface UseKpiDashboardSummaryOptions {
  /** The scope of the query: 'admin', 'leader', or 'collaborator' */
  scope: KpiDashboardScope;
  /** Team ID (required for 'leader' scope) */
  teamId?: string | null;
  /** Enable/disable the query */
  enabled?: boolean;
}

export function useKpiDashboardSummary({
  scope,
  teamId,
  enabled = true,
}: UseKpiDashboardSummaryOptions) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.home.kpiSummary(currentBuId ?? null, scope, teamId ?? null),
    queryFn: async () => {
      // For leader scope, team ID is required
      if (scope === 'leader' && !teamId) {
        return null;
      }

      const { data, error } = await supabase.rpc("rpc_kpi_dashboard_summary", {
        p_team_id: scope === 'leader' ? teamId : null,
        p_scope: scope,
      });

      if (error) {
        console.error("Error fetching KPI dashboard summary:", error);
        throw error;
      }

      return data as unknown as KpiDashboardSummary;
    },
    enabled: !!currentBuId && enabled && (scope !== 'leader' || !!teamId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    summary,
    isLoading,
    error,
    refetch,
    // Computed values for easy access
    hasKpis: (summary?.total ?? 0) > 0,
    hasCriticalKpis: (summary?.top_critical?.length ?? 0) > 0,
    hasUpdatesNeeded: (summary?.needs_update ?? 0) > 0,
  };
}
