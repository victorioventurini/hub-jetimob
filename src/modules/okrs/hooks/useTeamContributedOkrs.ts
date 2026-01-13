import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// Explicit fields for v_team_contributed_okrs view (based on actual schema)
const CONTRIBUTED_VIEW_FIELDS = `
  objective_id, title, description, status, primary_team_id, primary_team_name,
  contributor_team_id, contributor_team_name, is_shared, responsibility_model,
  org_objective_id, cycle_id, bu_id
` as const;

// Explicit fields for team objectives with KRs
const TEAM_OBJECTIVE_FIELDS = `
  id, title, description, status, team_id, created_at, updated_at,
  team:teams!okr_team_objectives_team_id_fkey(id, name),
  key_results:okr_team_key_results(
    id, title, baseline, current_value, target, direction, unit, status, last_checkin_at
  )
` as const;

// Explicit fields for shared OKRs summary view (matches actual view schema)
const SHARED_SUMMARY_FIELDS = `
  id, title, primary_team_id, primary_team_name,
  total_teams_count, is_shared, responsibility_model, status
` as const;

/**
 * Fetch shared OKRs where a team is a contributor (but not primary).
 * Uses the v_team_contributed_okrs view for efficient querying.
 */
export function useTeamContributedOkrs(teamId?: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamContributedOkrs(teamId ?? null),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      // First get the contributed objective IDs from the view
      const { data: contributions, error: contribError } = await supabase
        .from('v_team_contributed_okrs')
        .select(CONTRIBUTED_VIEW_FIELDS)
        .eq('contributor_team_id', teamId);

      if (contribError) {
        console.error('Error fetching contributed OKRs:', contribError);
        throw contribError;
      }

      if (!contributions || contributions.length === 0) return [];

      // Get unique objective IDs
      const objectiveIds = [...new Set(contributions.map(c => c.objective_id))];

      // Fetch full objective data with KRs
      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select(TEAM_OBJECTIVE_FIELDS)
        .in('id', objectiveIds)
        .is('deleted_at', null);

      if (objError) {
        console.error('Error fetching objective details:', objError);
        throw objError;
      }

      return objectives || [];
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Summary of shared OKRs across the organization.
 */
export function useSharedOkrsSummary() {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.sharedSummary(),
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('v_shared_okrs_summary')
        .select(SHARED_SUMMARY_FIELDS);

      if (error) {
        console.error('Error fetching shared OKRs summary:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isReady && !!supabase,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Count insights for shared OKRs.
 */
export function useSharedOkrsInsights() {
  const { data: sharedOkrs } = useSharedOkrsSummary();

  const insights = {
    sharedOkrsCount: sharedOkrs?.length || 0,
    teamsWithMostDependencies: [] as Array<{ name: string; count: number }>,
    overdueSharedOkrsCount: 0, // Would need to query check-ins
  };

  // Calculate teams with most contributions
  if (sharedOkrs && sharedOkrs.length > 0) {
    const teamCounts = new Map<string, number>();
    
    sharedOkrs.forEach((okr: any) => {
      // Count primary team
      if (okr.primary_team_name) {
        teamCounts.set(
          okr.primary_team_name, 
          (teamCounts.get(okr.primary_team_name) || 0) + 1
        );
      }
      // Count contributing teams
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
