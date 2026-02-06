/**
 * Team Key Result Queries
 * 
 * Queries for team key results.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// ============================================================
// TYPES
// ============================================================

export interface UseTeamKeyResultsOptions {
  buId?: string | null;
  teamId?: string;
  userId?: string;
  includeCancelled?: boolean;
}

// ============================================================
// QUERIES
// ============================================================

// Overload for backward compatibility with positional args
export function useTeamKeyResults(buId?: string | null, teamId?: string, includeCancelled?: boolean): ReturnType<typeof useTeamKeyResultsImpl>;
export function useTeamKeyResults(options?: UseTeamKeyResultsOptions): ReturnType<typeof useTeamKeyResultsImpl>;
export function useTeamKeyResults(
  buIdOrOptions?: string | null | UseTeamKeyResultsOptions,
  teamId?: string,
  includeCancelled?: boolean
) {
  const options: UseTeamKeyResultsOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, teamId, includeCancelled };
  
  return useTeamKeyResultsImpl(options);
}

function useTeamKeyResultsImpl(options: UseTeamKeyResultsOptions = {}) {
  const { buId, teamId, includeCancelled = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamKeyResults(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_key_results')
        .select(OKR_FIELDS.teamKr)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: OKR_STALE_TIME.list,
  });
}

export function useMyTeamKeyResults(buId?: string | null, userId?: string) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.myTeamKeyResults(buId, userId),
    queryFn: async () => {
      if (!buId || !userId || !supabase) return [];
      
      // First, get KRs where user is owner or co-responsible
      const { data: directKrs, error: directError } = await supabase
        .from('okr_team_key_results')
        .select(OKR_FIELDS.teamKr)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (directError) throw directError;
      
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
      
      // If there are KRs from initiatives, fetch them too
      let initiativeKrs: typeof directKrs = [];
      if (krIdsFromInitiatives.length > 0) {
        const { data: krsData, error: krsError } = await supabase
          .from('okr_team_key_results')
          .select(OKR_FIELDS.teamKr)
          .eq('bu_id', buId)
          .in('id', krIdsFromInitiatives)
          .is('deleted_at', null)
          .is('cancelled_at', null)
          .order('created_at', { ascending: false });
        
        if (krsError) throw krsError;
        initiativeKrs = krsData || [];
      }
      
      // Merge and dedupe KRs
      const allKrs = [...(directKrs || []), ...initiativeKrs];
      const uniqueKrIds = new Set<string>();
      const uniqueKrs = allKrs.filter(kr => {
        if (uniqueKrIds.has(kr.id)) return false;
        uniqueKrIds.add(kr.id);
        return true;
      });
      
      return uniqueKrs;
    },
    enabled: !!buId && !!userId && !!supabase,
    staleTime: OKR_STALE_TIME.list,
  });
}
