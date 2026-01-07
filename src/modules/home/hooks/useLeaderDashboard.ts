/**
 * Hook to fetch leader dashboard summary data
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import type { LeaderDashboardSummary, FocusItem } from "../types";

export function useLeaderDashboard(teamId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // Main dashboard summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["leader-dashboard-summary", currentBuId, teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase.rpc("rpc_leader_dashboard_summary", {
        p_team_id: teamId,
      });

      if (error) {
        console.error("Error fetching leader dashboard summary:", error);
        throw error;
      }

      return data as unknown as LeaderDashboardSummary;
    },
    enabled: !!currentBuId && !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Focus items
  const {
    data: focusItems = [],
    isLoading: isFocusLoading,
    error: focusError,
  } = useQuery({
    queryKey: ["leader-dashboard-focus", currentBuId, teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase.rpc("rpc_leader_dashboard_focus", {
        p_team_id: teamId,
      });

      if (error) {
        console.error("Error fetching leader focus items:", error);
        throw error;
      }

      return (data || []) as unknown as FocusItem[];
    },
    enabled: !!currentBuId && !!teamId,
    staleTime: 2 * 60 * 1000,
  });

  // Build critical alerts from summary data
  const criticalAlerts = summary ? buildCriticalAlerts(summary, teamId!) : [];

  return {
    summary,
    focusItems,
    criticalAlerts,
    isLoading: isSummaryLoading || isFocusLoading,
    error: summaryError || focusError,
    refetch: refetchSummary,
  };
}

// Helper to build critical alerts from summary
function buildCriticalAlerts(summary: LeaderDashboardSummary, teamId: string) {
  const alerts: Array<{
    type: string;
    title: string;
    subtitle: string;
    severity: 'high' | 'medium' | 'low';
    url: string;
    cta: string;
  }> = [];

  // Assets overdue
  if (summary.assets.overdue > 0) {
    alerts.push({
      type: 'asset_overdue',
      title: `${summary.assets.overdue} ativo(s) com devolução atrasada`,
      subtitle: 'Empréstimos do time',
      severity: 'high',
      url: '/assets/inventory?filter=overdue',
      cta: 'Cobrar devolução',
    });
  }

  // Tickets overdue
  if (summary.tickets.overdue > 0) {
    alerts.push({
      type: 'ticket_overdue',
      title: `${summary.tickets.overdue} ticket(s) vencido(s)`,
      subtitle: 'Tickets do time',
      severity: 'high',
      url: '/tickets?filter=overdue',
      cta: 'Ver tickets',
    });
  }

  // OKRs pending check-in
  if (summary.okrs.pending_checkins > 0) {
    alerts.push({
      type: 'okr_pending',
      title: `${summary.okrs.pending_checkins} KR(s) precisam de check-in`,
      subtitle: 'OKRs do time',
      severity: summary.okrs.pending_checkins > 5 ? 'high' : 'medium',
      url: `/okrs?team=${teamId}`,
      cta: 'Fazer check-in',
    });
  }

  // OKRs red (off-track)
  if (summary.okrs.red > 0) {
    alerts.push({
      type: 'okr_red',
      title: `${summary.okrs.red} OKR(s) fora do caminho`,
      subtitle: 'Atenção necessária',
      severity: 'medium',
      url: `/okrs?team=${teamId}&status=red`,
      cta: 'Revisar OKRs',
    });
  }

  // Sort by severity and limit to 5
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5);
}
