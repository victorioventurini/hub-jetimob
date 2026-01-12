import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

// Types
interface KpiSummary {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface OkrSummary {
  onTrack: number;
  atRisk: number;
  offTrack: number;
}

interface FocusItem {
  type: "warning" | "info" | "action";
  label: string;
  link?: string;
}

interface TeamStatus {
  teamName: string;
  onTrackPercent: number;
  atRiskPercent: number;
  offTrackPercent: number;
}

export interface HomeDashboardData {
  role: "executive" | "leader" | "collaborator";
  kpis: KpiSummary[];
  okrSummary: OkrSummary;
  focusItems: FocusItem[];
  teamStatus?: TeamStatus;
  isLoading: boolean;
}

// Map role to category - super_admin/admin get executive view
function mapRoleToCategory(role?: string): "executive" | "leader" | "collaborator" {
  if (!role) return "collaborator";
  
  const roleLower = role.toLowerCase();
  
  // super_admin ou admin => executive view
  if (roleLower.includes("super_admin") || roleLower.includes("admin")) {
    return "executive";
  }
  if (roleLower.includes("líder") || roleLower.includes("leader") || roleLower.includes("team_leader")) {
    return "leader";
  }
  return "collaborator";
}

// Static mock data for KPIs (until KPI module is fully integrated)
const mockKpisByRole: Record<string, KpiSummary[]> = {
  executive: [
    { label: "MRR", value: "R$ 1.180.000", change: "+4,2%", changeType: "positive" },
    { label: "NRR", value: "99%", change: "+1pp", changeType: "positive" },
    { label: "EBITDA", value: "R$ 320.000", changeType: "neutral" },
    { label: "NPS", value: "56", change: "+3", changeType: "positive" },
  ],
  leader: [
    { label: "Tickets Resolvidos", value: "142", change: "+12%", changeType: "positive" },
    { label: "CSAT", value: "4.6", changeType: "neutral" },
    { label: "Tempo Médio", value: "2.4h", change: "-18%", changeType: "positive" },
  ],
  collaborator: [
    { label: "Tarefas Concluídas", value: "23", change: "+8%", changeType: "positive" },
    { label: "Em Andamento", value: "5", changeType: "neutral" },
  ],
};

// Response type from RPC
interface DashboardRpcResponse {
  user_team_id: string | null;
  user_team_name: string | null;
  okr_counts: {
    on_track: number;
    at_risk: number;
    off_track: number;
  };
  checkin_summary: {
    overdue: number;
    pending: number;
  };
  team_count: number;
}

export function useHomeDashboard(): HomeDashboardData {
  const { role, user } = useAuth();
  const { currentBu } = useBu();
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  // Determine effective user ID for data fetching
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : user?.id;

  // Single RPC call to get all dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: isImpersonating && impersonatedUserId
      ? [...queryKeys.home.dashboard(buId, impersonatedUserId), 'impersonated']
      : queryKeys.home.dashboard(buId, user?.id ?? ''),
    queryFn: async (): Promise<DashboardRpcResponse | null> => {
      if (!buId || !effectiveUserId || !supabase) return null;
      
      const { data, error } = await supabase.rpc('rpc_home_dashboard_data', {
        p_bu_id: buId,
        p_user_id: effectiveUserId,
      });
      
      if (error) throw error;
      return data as unknown as DashboardRpcResponse;
    },
    enabled: isReady && !!buId && !!effectiveUserId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch impersonated user's role when impersonating
  const { data: impersonatedRole } = useQuery({
    queryKey: queryKeys.identity.impersonatedRole(buId ?? null, impersonatedUserId ?? null),
    queryFn: async () => {
      if (!supabase || !buId || !impersonatedUserId) return null;
      
      const { data, error } = await supabase.rpc('get_user_role_for_impersonation', {
        p_target_profile_id: impersonatedUserId,
        p_bu_id: buId,
      });
      
      if (error) {
        console.error("Error fetching impersonated role:", error);
        return null;
      }
      
      return data as string;
    },
    enabled: isReady && isImpersonating && !!impersonatedUserId && !!buId && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use impersonated role when impersonating, otherwise use real role
  const effectiveRole = isImpersonating && impersonatedRole 
    ? impersonatedRole 
    : role;
  
  const roleCategory = mapRoleToCategory(effectiveRole as string | undefined);

  // Extract data from RPC response
  const okrCounts = dashboardData?.okr_counts ?? { on_track: 0, at_risk: 0, off_track: 0 };
  const checkinSummary = dashboardData?.checkin_summary ?? { overdue: 0, pending: 0 };
  const teamCount = dashboardData?.team_count ?? 0;
  const userTeamName = dashboardData?.user_team_name;

  // Build focus items dynamically based on real data
  const focusItems: FocusItem[] = [];

  // Add check-in related focus items
  if (checkinSummary.overdue > 0) {
    focusItems.push({
      type: "action",
      label: `${checkinSummary.overdue} KR${checkinSummary.overdue > 1 ? 's' : ''} precisa${checkinSummary.overdue > 1 ? 'm' : ''} de check-in`,
      link: "/okrs",
    });
  }

  // Add at-risk OKRs warning
  if (okrCounts.at_risk > 0) {
    focusItems.push({
      type: "warning",
      label: `${okrCounts.at_risk} OKR${okrCounts.at_risk > 1 ? 's' : ''} em risco`,
      link: "/okrs",
    });
  }

  // Add off-track OKRs warning
  if (okrCounts.off_track > 0) {
    focusItems.push({
      type: "warning",
      label: `${okrCounts.off_track} OKR${okrCounts.off_track > 1 ? 's' : ''} fora do caminho`,
      link: "/okrs",
    });
  }

  // Add info items for executives
  if (roleCategory === "executive" && teamCount > 0) {
    focusItems.push({
      type: "info",
      label: `${teamCount} time${teamCount > 1 ? 's' : ''} ativo${teamCount > 1 ? 's' : ''}`,
      link: "/teams",
    });
  }

  // If no focus items, add an encouraging message
  if (focusItems.length === 0) {
    focusItems.push({
      type: "info",
      label: "Tudo em dia! Continue assim.",
    });
  }

  // Calculate team status
  let teamStatus: TeamStatus | undefined;
  const total = okrCounts.on_track + okrCounts.at_risk + okrCounts.off_track;
  if (total > 0) {
    const teamName = roleCategory === "executive" 
      ? "Toda a BU" 
      : userTeamName || "Meu Time";

    teamStatus = {
      teamName,
      onTrackPercent: Math.round((okrCounts.on_track / total) * 100),
      atRiskPercent: Math.round((okrCounts.at_risk / total) * 100),
      offTrackPercent: Math.round((okrCounts.off_track / total) * 100),
    };
  }

  return {
    role: roleCategory,
    kpis: mockKpisByRole[roleCategory] || mockKpisByRole.collaborator,
    okrSummary: { 
      onTrack: okrCounts.on_track, 
      atRisk: okrCounts.at_risk, 
      offTrack: okrCounts.off_track 
    },
    focusItems,
    teamStatus,
    isLoading,
  };
}
