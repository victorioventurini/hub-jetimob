/**
 * Team Contributed OKRs Queries
 * 
 * Queries for shared/contributed OKRs between teams.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { AGGREGATE_FIELDS } from './aggregateUtils';

// ============================================================
// TEAM CONTRIBUTED OKRS
// ============================================================

export function useTeamContributedOkrs(teamId?: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamContributedOkrs(teamId ?? null),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      const { data: contributions, error: contribError } = await supabase
        .from('v_team_contributed_okrs')
        .select(AGGREGATE_FIELDS.contributedView)
        .eq('contributor_team_id', teamId);

      if (contribError) {
        console.error('Error fetching contributed OKRs:', contribError);
        throw contribError;
      }

      if (!contributions || contributions.length === 0) return [];

      const objectiveIds = [...new Set(contributions.map(c => c.objective_id))];

      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select(AGGREGATE_FIELDS.teamObjectiveWithKrs)
        .in('id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (objError) {
        console.error('Error fetching objective details:', objError);
        throw objError;
      }

      return objectives || [];
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================
// SHARED OKRS SUMMARY
// ============================================================

export function useSharedOkrsSummary() {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.sharedSummary(),
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('v_shared_okrs_summary')
        .select(AGGREGATE_FIELDS.sharedSummary);

      if (error) {
        console.error('Error fetching shared OKRs summary:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isReady && !!supabase,
    staleTime: 3 * 60 * 1000,
  });
}

export function useSharedOkrsInsights() {
  const { data: sharedOkrs } = useSharedOkrsSummary();

  const insights = {
    sharedOkrsCount: sharedOkrs?.length || 0,
    teamsWithMostDependencies: [] as Array<{ name: string; count: number }>,
    overdueSharedOkrsCount: 0,
  };

  if (sharedOkrs && sharedOkrs.length > 0) {
    const teamCounts = new Map<string, number>();
    
    sharedOkrs.forEach((okr: any) => {
      if (okr.primary_team_name) {
        teamCounts.set(
          okr.primary_team_name, 
          (teamCounts.get(okr.primary_team_name) || 0) + 1
        );
      }
      if (okr.contributing_team_names) {
        okr.contributing_team_names.forEach((teamName: string) => {
          teamCounts.set(teamName, (teamCounts.get(teamName) || 0) + 1);
        });
      }
    });

    insights.teamsWithMostDependencies = Array.from(teamCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  return insights;
}
