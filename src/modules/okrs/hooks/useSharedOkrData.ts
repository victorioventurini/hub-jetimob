import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OkrContributor {
  id: string;
  objective_id: string;
  team_id: string;
  created_at: string;
  team?: {
    id: string;
    name: string;
  };
}

/**
 * Fetch contributing teams for a specific team objective
 */
export function useObjectiveContributors(objectiveId: string | undefined) {
  return useQuery({
    queryKey: ['okr-objective-contributors', objectiveId],
    queryFn: async (): Promise<OkrContributor[]> => {
      if (!objectiveId) return [];

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
    enabled: !!objectiveId,
  });
}

/**
 * Fetch all shared objectives that a team contributes to (but is not primary)
 */
export function useTeamContributedObjectives(teamId: string | undefined) {
  return useQuery({
    queryKey: ['okr-team-contributed-objectives', teamId],
    queryFn: async () => {
      if (!teamId) return [];

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
          *,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .in('id', objectiveIds)
        .neq('team_id', teamId) // Exclude objectives where this team is primary
        .is('deleted_at', null);

      if (objError) throw objError;
      return objectives;
    },
    enabled: !!teamId,
  });
}

/**
 * Manage contributors for an objective
 */
export function useManageContributors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      objectiveId, 
      teamIds 
    }: { 
      objectiveId: string; 
      teamIds: string[] 
    }) => {
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
        queryKey: ['okr-objective-contributors', variables.objectiveId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['okr-team-objectives'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['okr-team-objectives-with-krs'] 
      });
    },
    onError: (error) => {
      console.error('Error managing contributors:', error);
      toast.error('Erro ao atualizar times contribuidores');
    },
  });
}

/**
 * Hook to fetch team objectives including shared info
 */
export function useTeamObjectivesWithSharedInfo(buId?: string | null, teamId?: string) {
  return useQuery({
    queryKey: ['okr-team-objectives-with-shared', buId, teamId],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(`
          *,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: objectives, error } = await query;
      if (error) throw error;

      // Fetch contributors for shared objectives
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

      // Merge contributors into objectives
      return objectives?.map(obj => ({
        ...obj,
        contributors: contributorsMap.get(obj.id) || [],
      }));
    },
    enabled: !!buId,
  });
}
