/**
 * Org Objective Queries
 * 
 * Queries for organizational objectives.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// ============================================================
// TYPES
// ============================================================

export interface UseOrgObjectivesOptions {
  buId?: string | null;
  year?: number;
  includeAllStatuses?: boolean;
}

// ============================================================
// QUERIES
// ============================================================

// Overload for backward compatibility with positional args
export function useOrgObjectives(buId?: string | null, year?: number, includeAllStatuses?: boolean): ReturnType<typeof useOrgObjectivesImpl>;
export function useOrgObjectives(options?: UseOrgObjectivesOptions): ReturnType<typeof useOrgObjectivesImpl>;
export function useOrgObjectives(
  buIdOrOptions?: string | null | UseOrgObjectivesOptions,
  year?: number,
  includeAllStatuses?: boolean
) {
  // Handle both call signatures
  const options: UseOrgObjectivesOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, year, includeAllStatuses };
  
  return useOrgObjectivesImpl(options);
}

function useOrgObjectivesImpl(options: UseOrgObjectivesOptions = {}) {
  const { buId, year, includeAllStatuses = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjectives(buId, year),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjectiveWithKrs)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
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

export function useOrgObjective(id: string) {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjective(id),
    queryFn: async () => {
      if (!supabase || !buId) return null;
      
      const { data, error } = await supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjective)
        .eq('id', id)
        .is('cancelled_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!buId && !!supabase,
    staleTime: OKR_STALE_TIME.detail,
  });
}
