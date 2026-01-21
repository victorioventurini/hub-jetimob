import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
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
 * Supports impersonation - during impersonation, shows summary only for visible tickets.
 * @see Wave 4 - Performance optimization
 */
export function useTicketsSummary(teamId?: string) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  return useQuery({
    queryKey: [...queryKeys.tickets.summary(buId, teamId), isImpersonating ? impersonatedUserId : null],
    queryFn: async (): Promise<TicketsSummaryData | null> => {
      if (!buId || !supabase) return null;

      // Durante impersonação, calcular summary baseado apenas em tickets visíveis
      if (isImpersonating && impersonatedUserId) {
        // Primeiro obter IDs de tickets visíveis
        const { data: visibleIds, error: rpcError } = await supabase
          .rpc("get_visible_ticket_ids_for_impersonation", {
            p_profile_id: impersonatedUserId,
          });
        
        if (rpcError) throw rpcError;
        
        // RPC returns uuid[] directly
        const ticketIds = visibleIds || [];
        
        if (ticketIds.length === 0) {
          return {
            status_counts: {},
            priority_counts: {},
            overdue_count: 0,
            due_today_count: 0,
            due_this_week_count: 0,
            avg_resolution_hours: null,
            total_open: 0,
            total_closed: 0,
          };
        }

        // Buscar tickets visíveis e calcular métricas
        const { data: tickets, error: ticketsError } = await supabase
          .from("tickets")
          .select("id, status, expected_due_at")
          .in("id", ticketIds)
          .is("deleted_at", null);

        if (ticketsError) throw ticketsError;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const statusCounts: Record<string, number> = {};
        let overdueCount = 0;
        let dueTodayCount = 0;
        let dueThisWeekCount = 0;
        let totalOpen = 0;
        let totalClosed = 0;

        (tickets || []).forEach((t) => {
          statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
          
          const isOpen = !["done", "discarded"].includes(t.status);
          if (isOpen) {
            totalOpen++;
            if (t.expected_due_at) {
              const dueDate = new Date(t.expected_due_at);
              if (dueDate < now) overdueCount++;
              else if (dueDate.toDateString() === today.toDateString()) dueTodayCount++;
              else if (dueDate <= nextWeek) dueThisWeekCount++;
            }
          } else {
            totalClosed++;
          }
        });

        return {
          status_counts: statusCounts,
          priority_counts: {}, // Simplificado para impersonação
          overdue_count: overdueCount,
          due_today_count: dueTodayCount,
          due_this_week_count: dueThisWeekCount,
          avg_resolution_hours: null, // Simplificado para impersonação
          total_open: totalOpen,
          total_closed: totalClosed,
        };
      }

      // Normal mode - use optimized RPC
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
