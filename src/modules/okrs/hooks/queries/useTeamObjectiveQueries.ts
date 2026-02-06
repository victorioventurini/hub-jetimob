/**
 * Team Objective Queries
 * 
 * Queries for team objectives.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// ============================================================
// TYPES
// ============================================================

export interface UseTeamObjectivesOptions {
  buId?: string | null;
  teamId?: string;
  includeAllStatuses?: boolean;
}

// ============================================================
// QUERIES
// ============================================================

// Overload for backward compatibility with positional args
export function useTeamObjectives(buId?: string | null, teamId?: string, includeAllStatuses?: boolean): ReturnType<typeof useTeamObjectivesImpl>;
export function useTeamObjectives(options?: UseTeamObjectivesOptions): ReturnType<typeof useTeamObjectivesImpl>;
export function useTeamObjectives(
  buIdOrOptions?: string | null | UseTeamObjectivesOptions,
  teamId?: string,
  includeAllStatuses?: boolean
) {
  const options: UseTeamObjectivesOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, teamId, includeAllStatuses };
  
  return useTeamObjectivesImpl(options);
}

function useTeamObjectivesImpl(options: UseTeamObjectivesOptions = {}) {
  const { buId, teamId, includeAllStatuses = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamObjectives(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(OKR_FIELDS.teamObjectiveWithKrs)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (!includeAllStatuses) {
        query = query.neq('status', 'cancelled').neq('status', 'discarded');
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out deleted/cancelled KRs from the nested results
      return (data || []).map(obj => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at
        ),
      }));
    },
    enabled: !!buId && !!supabase,
    staleTime: OKR_STALE_TIME.list,
  });
}

/**
 * Fetch team objectives where user is owner of a KR or co-responsible
 * Used for "Meus OKRs" view
 */
export function useMyTeamObjectives(buId?: string | null, userId?: string) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.myTeamObjectives(buId, userId),
    queryFn: async () => {
      if (!buId || !userId || !supabase) return [];
      
      // First, get KRs where user is owner or co-responsible
      const { data: myKrs, error: krError } = await supabase
        .from('okr_team_key_results')
        .select('team_objective_id')
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`);

      if (krError) throw krError;
      
      // Also get KRs that have initiatives where user is owner (exclude cancelled/deleted)
      const { data: initiativeKrIds, error: initError } = await supabase
        .from('okr_initiatives')
        .select('kr_id')
        .eq('bu_id', buId)
        .eq('owner_user_id', userId)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (initError) throw initError;
      
      const krIdsFromInitiatives = [...new Set(initiativeKrIds?.map(i => i.kr_id).filter(Boolean) || [])];
      
      // Get objective IDs from those KRs
      let objectiveIdsFromInitiatives: string[] = [];
      if (krIdsFromInitiatives.length > 0) {
        const { data: krsWithObj, error: krsObjError } = await supabase
          .from('okr_team_key_results')
          .select('team_objective_id')
          .in('id', krIdsFromInitiatives)
          .is('deleted_at', null)
          .is('cancelled_at', null);
        
        if (krsObjError) throw krsObjError;
        objectiveIdsFromInitiatives = krsWithObj?.map(kr => kr.team_objective_id).filter(Boolean) || [];
      }
      
      // Get unique objective IDs from both sources
      const allObjectiveIds = [
        ...(myKrs?.map(kr => kr.team_objective_id).filter(Boolean) || []),
        ...objectiveIdsFromInitiatives
      ];
      const objectiveIds = [...new Set(allObjectiveIds)];
      
      if (objectiveIds.length === 0) return [];
      
      // Fetch those objectives with their KRs
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select(OKR_FIELDS.teamObjectiveWithKrs)
        .eq('bu_id', buId)
        .in('id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!userId && !!supabase,
    staleTime: OKR_STALE_TIME.list,
  });
}
