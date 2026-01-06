import { useAuth } from "@/hooks/useAuth";
import { usePendingCheckins, useCheckinSummary } from "@/modules/okrs/hooks/usePendingCheckins";
import { useTeams } from "@/modules/teams/hooks/useTeams";
import { useBu } from "@/contexts/BuContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Map role to category (simplified - no more "ceo" role)
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

// Hook to get user's team ID
function useUserTeamId(userId?: string) {
  return useQuery({
    queryKey: ['user-team-id', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.team_id || null;
    },
    enabled: !!userId,
  });
}

// Hook to get real OKR status counts - scoped to BU
function useOkrStatusCounts(buId?: string | null, teamId?: string | null) {
  return useQuery({
    queryKey: ['okr-status-counts', buId, teamId],
    queryFn: async () => {
      if (!buId) return { onTrack: 0, atRisk: 0, offTrack: 0 };
      
      let query = supabase
        .from('okr_team_key_results')
        .select('status')
        .eq('bu_id', buId)
        .is('deleted_at', null);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts = {
        onTrack: 0,
        atRisk: 0,
        offTrack: 0,
      };

      data?.forEach(kr => {
        switch (kr.status) {
          case 'green':
            counts.onTrack++;
            break;
          case 'yellow':
            counts.atRisk++;
            break;
          case 'red':
            counts.offTrack++;
            break;
        }
      });

      return counts;
    },
    enabled: !!buId,
  });
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

export function useHomeDashboard(): HomeDashboardData {
  const { role, user } = useAuth();
  const { currentBu } = useBu();
  const { data: pendingCheckins, isLoading: checkinsLoading } = usePendingCheckins();
  const { summary: checkinSummary } = useCheckinSummary();
  const { data: userTeamId } = useUserTeamId(user?.id);
  const { data: okrCounts, isLoading: okrLoading } = useOkrStatusCounts(currentBu?.id, userTeamId);
  const { data: teams } = useTeams();
  
  const roleCategory = mapRoleToCategory(role as string | undefined);
  const isLoading = checkinsLoading || okrLoading;

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
  if (okrCounts && okrCounts.atRisk > 0) {
    focusItems.push({
      type: "warning",
      label: `${okrCounts.atRisk} OKR${okrCounts.atRisk > 1 ? 's' : ''} em risco`,
      link: "/okrs",
    });
  }

  // Add off-track OKRs warning
  if (okrCounts && okrCounts.offTrack > 0) {
    focusItems.push({
      type: "warning",
      label: `${okrCounts.offTrack} OKR${okrCounts.offTrack > 1 ? 's' : ''} fora do caminho`,
      link: "/okrs",
    });
  }

  // Add info items for executives
  if (roleCategory === "executive") {
    // Count teams with pending check-ins (mock for now)
    if (teams && teams.length > 0) {
      focusItems.push({
        type: "info",
        label: `${teams.length} time${teams.length > 1 ? 's' : ''} ativo${teams.length > 1 ? 's' : ''}`,
        link: "/teams",
      });
    }
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
  if (okrCounts) {
    const total = okrCounts.onTrack + okrCounts.atRisk + okrCounts.offTrack;
    if (total > 0) {
      const teamName = roleCategory === "executive" 
        ? "Toda a BU" 
        : userTeamId
          ? teams?.find(t => t.id === userTeamId)?.name || "Meu Time"
          : "Meu Time";

      teamStatus = {
        teamName,
        onTrackPercent: Math.round((okrCounts.onTrack / total) * 100),
        atRiskPercent: Math.round((okrCounts.atRisk / total) * 100),
        offTrackPercent: Math.round((okrCounts.offTrack / total) * 100),
      };
    }
  }

  return {
    role: roleCategory,
    kpis: mockKpisByRole[roleCategory] || mockKpisByRole.collaborator,
    okrSummary: okrCounts || { onTrack: 0, atRisk: 0, offTrack: 0 },
    focusItems,
    teamStatus,
    isLoading,
  };
}
