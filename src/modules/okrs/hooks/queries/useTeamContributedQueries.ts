/**
 * Team Contributed OKRs Queries
 * 
 * Queries for shared/contributed OKRs between teams.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
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
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');

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
// SHARED OKRS SUMMARY (com escopo)
// ============================================================

export interface SharedOkrsScope {
  /** Filtra OKRs onde o time é dono OU contribuidor */
  teamId?: string | null;
  /** Filtra por ano (ciclo) */
  year?: number | null;
}

/**
 * Lista os OKRs compartilhados (is_shared=true) na BU atual.
 *
 * Quando `scope.teamId` é informado, retorna apenas OKRs onde o time é
 * dono (primary_team_id) OU contribuidor (contributor_team_ids inclui o id).
 * Quando `scope.year` é informado, filtra também pelo ano do objetivo.
 *
 * Sem escopo, retorna TODOS os shared OKRs visíveis pela RLS — útil apenas
 * para visões BU-wide (ex: dashboard executivo).
 */
export function useSharedOkrsSummary(scope: SharedOkrsScope = {}) {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBuId } = useBu();
  const { teamId, year } = scope;

  return useQuery({
    queryKey: queryKeys.okrs.sharedSummary(currentBuId ?? null, teamId ?? null, year ?? null),
    queryFn: async () => {
      if (!supabase || !currentBuId) return [];

      let query = supabase
        .from('v_shared_okrs_summary')
        .select(AGGREGATE_FIELDS.sharedSummary);

      if (teamId) {
        // Time é dono OU consta na lista de contribuidores
        // (postgrest: cs = contains para arrays)
        query = query.or(
          `primary_team_id.eq.${teamId},contributor_team_ids.cs.{${teamId}}`,
        );
      }

      if (typeof year === 'number') {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching shared OKRs summary:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isReady && !!supabase && !!currentBuId,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Insights derivados do summary, com o MESMO escopo passado para o summary.
 * Ver mem://features/okrs/shared-okrs-insights-scope-standard.
 */
export function useSharedOkrsInsights(scope: SharedOkrsScope = {}) {
  const { data: sharedOkrs } = useSharedOkrsSummary(scope);

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
