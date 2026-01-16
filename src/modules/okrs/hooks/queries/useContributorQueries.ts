/**
 * Contributor Queries & Mutations
 * 
 * Queries and mutations for managing objective contributors.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import type { OkrContributor } from './aggregateTypes';

// ============================================================
// CONTRIBUTOR QUERIES
// ============================================================

export function useObjectiveContributors(objectiveId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.objectiveContributors(objectiveId ?? null),
    queryFn: async (): Promise<OkrContributor[]> => {
      if (!objectiveId || !supabase) return [];

      const { data, error } = await supabase
        .from('okr_team_objective_contributors')
        .select(`
          id,
          objective_id,
          team_id,
          created_at,
          team:teams(id, name)
        `)
        .eq('objective_id', objectiveId);

      if (error) throw error;
      return data as unknown as OkrContributor[];
    },
    enabled: !!objectiveId && isReady && !!supabase,
  });
}

export function useTeamContributedObjectives(teamId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamContributedObjectives(teamId ?? null),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      const { data: contributions, error: contribError } = await supabase
        .from('okr_team_objective_contributors')
        .select('objective_id')
        .eq('team_id', teamId);

      if (contribError) throw contribError;
      if (!contributions || contributions.length === 0) return [];

      const objectiveIds = contributions.map(c => c.objective_id);

      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select(`
          id, bu_id, team_id, title, description, year, status, org_objective_id,
          is_shared, responsibility_model, created_at, updated_at, deleted_at, cancelled_at,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .in('id', objectiveIds)
        .neq('team_id', teamId)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (objError) throw objError;
      return objectives;
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeamObjectivesWithSharedInfo(buId?: string | null, teamId?: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamObjectivesWithShared(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(`
          id, bu_id, team_id, title, description, year, status, org_objective_id,
          is_shared, responsibility_model, created_at, updated_at, deleted_at, cancelled_at,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: objectives, error } = await query;
      if (error) throw error;

      const sharedObjectiveIds = objectives
        ?.filter(obj => obj.is_shared)
        .map(obj => obj.id) || [];

      let contributorsMap = new Map<string, OkrContributor[]>();

      if (sharedObjectiveIds.length > 0) {
        const { data: contributors, error: contribError } = await supabase
          .from('okr_team_objective_contributors')
          .select(`
            id,
            objective_id,
            team_id,
            created_at,
            team:teams(id, name)
          `)
          .in('objective_id', sharedObjectiveIds);

        if (contribError) throw contribError;

        contributors?.forEach(contrib => {
          const existing = contributorsMap.get(contrib.objective_id) || [];
          existing.push(contrib as unknown as OkrContributor);
          contributorsMap.set(contrib.objective_id, existing);
        });
      }

      return objectives?.map(obj => ({
        ...obj,
        contributors: contributorsMap.get(obj.id) || [],
      }));
    },
    enabled: !!buId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================
// CONTRIBUTOR MUTATIONS
// ============================================================

/**
 * Manage contributors for an objective
 */
export function useManageContributors() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ 
      objectiveId, 
      teamIds 
    }: { 
      objectiveId: string; 
      teamIds: string[] 
    }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      // First, delete existing contributors
      const { error: deleteError } = await supabase
        .from('okr_team_objective_contributors')
        .delete()
        .eq('objective_id', objectiveId);

      if (deleteError) throw deleteError;

      // Then insert new contributors
      if (teamIds.length > 0) {
        const contributors = teamIds.map(teamId => ({
          objective_id: objectiveId,
          team_id: teamId,
        }));

        const { error: insertError } = await supabase
          .from('okr_team_objective_contributors')
          .insert(contributors);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.okrs.objectiveContributors(variables.objectiveId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.okrs.teamObjectivesAll(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.okrs.teamObjectivesWithKrsAll(),
        refetchType: 'active',
      });
    },
    onError: (error) => {
      console.error('Error managing contributors:', error);
      toast.error('Erro ao atualizar times contribuidores');
    },
  });
}
