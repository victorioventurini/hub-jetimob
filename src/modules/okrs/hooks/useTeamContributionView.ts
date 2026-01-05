import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

export interface TeamOkrContribution {
  id: string;
  title: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  lastCheckinAt: string | null;
  target: number;
  currentValue: number;
  baseline: number;
  unit: string;
}

export interface OrgKrContribution {
  id: string;
  title: string;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  progress: number;
  teamOkrs: TeamOkrContribution[];
}

export interface OrgObjectiveContribution {
  id: string;
  title: string;
  description: string | null;
  status: 'on_track' | 'at_risk' | 'off_track';
  progress: number;
  orgKrs: OrgKrContribution[];
  totalTeamOkrs: number;
}

export interface TeamContributionData {
  team: {
    id: string;
    name: string;
    description: string | null;
    leaderName: string | null;
    leaderPhotoUrl: string | null;
  };
  totalActiveOkrs: number;
  aggregatedStatus: 'on_track' | 'at_risk' | 'off_track';
  aggregatedProgress: number;
  contributions: OrgObjectiveContribution[];
}

const calculateProgress = (baseline: number, current: number, target: number, direction: string): number => {
  if (direction === 'down') {
    if (baseline === target) return current <= target ? 100 : 0;
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, Math.min(100, progress));
  }
  if (baseline === target) return current >= target ? 100 : 0;
  const progress = ((current - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, progress));
};

const ragToStatus = (rag: string): 'on_track' | 'at_risk' | 'off_track' => {
  switch (rag) {
    case 'green': return 'on_track';
    case 'yellow': return 'at_risk';
    case 'red': 
    case 'not_started':
    default: return 'off_track';
  }
};

const calculateAggregatedStatus = (items: { status: string }[]): 'on_track' | 'at_risk' | 'off_track' => {
  if (items.length === 0) return 'off_track';
  
  const hasRed = items.some(item => item.status === 'red' || item.status === 'off_track');
  const hasYellow = items.some(item => item.status === 'yellow' || item.status === 'at_risk');
  
  if (hasRed) return 'off_track';
  if (hasYellow) return 'at_risk';
  return 'on_track';
};

export const useTeamContributionView = (teamId: string | undefined) => {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ['team-contribution-view', teamId, currentBu?.id],
    queryFn: async (): Promise<TeamContributionData | null> => {
      if (!teamId || !currentBu?.id) return null;

      // Fetch team info
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          leader:profiles!teams_leader_user_id_fkey(
            display_name,
            photo_url
          )
        `)
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        console.error('Error fetching team:', teamError);
        return null;
      }

      // Fetch all team KRs that are linked to org KRs
      const { data: teamKrs, error: krsError } = await supabase
        .from('okr_team_key_results')
        .select(`
          id,
          title,
          status,
          current_value,
          baseline,
          target,
          unit,
          direction,
          last_checkin_at,
          linked_org_kr_id,
          team_objective:okr_team_objectives(
            id,
            title
          )
        `)
        .eq('team_id', teamId)
        .eq('bu_id', currentBu.id)
        .is('deleted_at', null)
        .not('linked_org_kr_id', 'is', null);

      if (krsError) {
        console.error('Error fetching team KRs:', krsError);
        return null;
      }

      // Get unique org KR ids
      const orgKrIds = [...new Set(teamKrs?.map(kr => kr.linked_org_kr_id).filter(Boolean) as string[])];

      if (orgKrIds.length === 0) {
        // Team has no contributions to org objectives
        const leaderData = team.leader as { display_name: string; photo_url: string | null } | null;
        return {
          team: {
            id: team.id,
            name: team.name,
            description: team.description,
            leaderName: leaderData?.display_name || null,
            leaderPhotoUrl: leaderData?.photo_url || null,
          },
          totalActiveOkrs: 0,
          aggregatedStatus: 'off_track',
          aggregatedProgress: 0,
          contributions: [],
        };
      }

      // Fetch org KRs
      const { data: orgKrs, error: orgKrsError } = await supabase
        .from('okr_org_key_results')
        .select(`
          id,
          title,
          status,
          current_value,
          baseline,
          target,
          unit,
          direction,
          org_objective_id
        `)
        .in('id', orgKrIds)
        .is('deleted_at', null);

      if (orgKrsError) {
        console.error('Error fetching org KRs:', orgKrsError);
        return null;
      }

      // Get unique org objective ids
      const orgObjectiveIds = [...new Set(orgKrs?.map(kr => kr.org_objective_id) as string[])];

      // Fetch org objectives
      const { data: orgObjectives, error: objError } = await supabase
        .from('okr_org_objectives')
        .select('id, title, description, status')
        .in('id', orgObjectiveIds)
        .is('deleted_at', null);

      if (objError) {
        console.error('Error fetching org objectives:', objError);
        return null;
      }

      // Build the contribution structure
      const contributions: OrgObjectiveContribution[] = (orgObjectives || []).map(obj => {
        const relatedOrgKrs = (orgKrs || []).filter(kr => kr.org_objective_id === obj.id);
        
        const orgKrsWithTeamOkrs: OrgKrContribution[] = relatedOrgKrs.map(orgKr => {
          const relatedTeamKrs = (teamKrs || []).filter(tkr => tkr.linked_org_kr_id === orgKr.id);
          
          const teamOkrs: TeamOkrContribution[] = relatedTeamKrs.map(tkr => ({
            id: tkr.id,
            title: tkr.title,
            progress: calculateProgress(
              Number(tkr.baseline),
              Number(tkr.current_value),
              Number(tkr.target),
              tkr.direction
            ),
            status: ragToStatus(tkr.status),
            lastCheckinAt: tkr.last_checkin_at,
            target: Number(tkr.target),
            currentValue: Number(tkr.current_value),
            baseline: Number(tkr.baseline),
            unit: tkr.unit,
          }));

          return {
            id: orgKr.id,
            title: orgKr.title,
            status: orgKr.status as 'green' | 'yellow' | 'red' | 'not_started',
            progress: calculateProgress(
              Number(orgKr.baseline),
              Number(orgKr.current_value),
              Number(orgKr.target),
              orgKr.direction
            ),
            teamOkrs,
          };
        });

        const allTeamOkrs = orgKrsWithTeamOkrs.flatMap(kr => kr.teamOkrs);
        const totalTeamOkrs = allTeamOkrs.length;
        const avgProgress = totalTeamOkrs > 0
          ? allTeamOkrs.reduce((sum, okr) => sum + okr.progress, 0) / totalTeamOkrs
          : 0;

        return {
          id: obj.id,
          title: obj.title,
          description: obj.description,
          status: calculateAggregatedStatus(allTeamOkrs),
          progress: avgProgress,
          orgKrs: orgKrsWithTeamOkrs,
          totalTeamOkrs,
        };
      });

      // Calculate team aggregated stats
      const allTeamOkrs = contributions.flatMap(c => c.orgKrs.flatMap(kr => kr.teamOkrs));
      const totalActiveOkrs = allTeamOkrs.length;
      const aggregatedProgress = totalActiveOkrs > 0
        ? allTeamOkrs.reduce((sum, okr) => sum + okr.progress, 0) / totalActiveOkrs
        : 0;
      const aggregatedStatus = calculateAggregatedStatus(allTeamOkrs);

      const leaderData = team.leader as { display_name: string; photo_url: string | null } | null;

      return {
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          leaderName: leaderData?.display_name || null,
          leaderPhotoUrl: leaderData?.photo_url || null,
        },
        totalActiveOkrs,
        aggregatedStatus,
        aggregatedProgress,
        contributions,
      };
    },
    enabled: !!teamId && !!currentBu?.id,
  });
};
