import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { CACHE_TIMES } from "@/lib/queryCacheConfig";

/**
 * Response type from rpc_tickets_summary
 */
export interface TicketsSummaryData {
  status_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  overdue_count: number;
  due_today_count: number;
  due_this_week_count: number;
  avg_resolution_hours: number | null;
  total_open: number;
  total_closed: number;
}

/**
 * Hook to fetch tickets summary using aggregated RPC
 * 
 * Consolidates multiple queries into a single optimized call.
 * @see Wave 4 - Performance optimization
 */
export function useTicketsSummary(teamId?: string) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.tickets.summary(buId, teamId),
    queryFn: async (): Promise<TicketsSummaryData | null> => {
      if (!buId || !supabase) return null;

      const { data, error } = await supabase.rpc('rpc_tickets_summary', {
        p_bu_id: buId,
        p_team_id: teamId || null,
      });

      if (error) throw error;
      return data as unknown as TicketsSummaryData;
    },
    enabled: isReady && !!buId && !!supabase,
    staleTime: CACHE_TIMES.DYNAMIC_SHORT, // 30 seconds
  });
}

/**
 * Derived metrics from tickets summary
 */
export function useTicketsMetrics(teamId?: string) {
  const { data: summary, isLoading, error } = useTicketsSummary(teamId);

  const metrics = {
    totalOpen: summary?.total_open ?? 0,
    totalClosed: summary?.total_closed ?? 0,
    overdueCount: summary?.overdue_count ?? 0,
    dueTodayCount: summary?.due_today_count ?? 0,
    dueThisWeekCount: summary?.due_this_week_count ?? 0,
    avgResolutionHours: summary?.avg_resolution_hours ?? null,
    
    // Calculated metrics
    overduePercentage: summary?.total_open 
      ? Math.round((summary.overdue_count / summary.total_open) * 100) 
      : 0,
    resolutionRate: summary?.total_open || summary?.total_closed
      ? Math.round((summary.total_closed / (summary.total_open + summary.total_closed)) * 100)
      : 0,
  };

  return {
    metrics,
    statusCounts: summary?.status_counts ?? {},
    priorityCounts: summary?.priority_counts ?? {},
    isLoading,
    error,
  };
}
