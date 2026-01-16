/**
 * Org Key Result Queries
 * 
 * Queries for organizational key results.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// ============================================================
// TYPES
// ============================================================

export interface UseOrgKeyResultsOptions {
  buId?: string | null;
  objectiveId?: string;
  includeCancelled?: boolean;
}

// ============================================================
// QUERIES
// ============================================================

// Overload for backward compatibility with positional args
export function useOrgKeyResults(buId?: string | null, objectiveId?: string, includeCancelled?: boolean): ReturnType<typeof useOrgKeyResultsImpl>;
export function useOrgKeyResults(options?: UseOrgKeyResultsOptions): ReturnType<typeof useOrgKeyResultsImpl>;
export function useOrgKeyResults(
  buIdOrOptions?: string | null | UseOrgKeyResultsOptions,
  objectiveId?: string,
  includeCancelled?: boolean
) {
  const options: UseOrgKeyResultsOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, objectiveId, includeCancelled };
  
  return useOrgKeyResultsImpl(options);
}

function useOrgKeyResultsImpl(options: UseOrgKeyResultsOptions = {}) {
  const { buId, objectiveId, includeCancelled = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgKeyResults(buId, objectiveId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select(OKR_FIELDS.orgKr)
        .eq('bu_id', buId)
        .is('deleted_at', null);
        
      if (objectiveId) {
        query = query.eq('org_objective_id', objectiveId);
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
