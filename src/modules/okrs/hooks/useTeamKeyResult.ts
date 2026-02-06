/**
 * useTeamKeyResult
 * 
 * Hook to fetch a single Team Key Result by ID.
 * Used for deep-linking from KPI linked KRs section.
 * 
 * @see DEVELOPMENT_STANDARDS.md - Query Keys, BU-scoped client
 * @since v2.88.0
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamKeyResultData {
  id: string;
  title: string;
  baseline: number | null;
  current_value: number | null;
  target: number | null;
  unit: string | null;
  direction: 'up' | 'down' | 'maintain';
  status: 'green' | 'yellow' | 'red' | 'not_started';
  type: 'contribution' | 'enabler' | 'foundational';
  owner: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
  objective: {
    id: string;
    title: string;
  } | null;
}

export function useTeamKeyResult(krId: string | null) {
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamKeyResultDetail(krId),
    queryFn: async (): Promise<TeamKeyResultData | null> => {
      if (!supabase || !krId) return null;
      
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select(`
          id, 
          title, 
          baseline, 
          current_value, 
          target, 
          unit, 
          direction, 
          status, 
          type,
          owner:profiles!owner_id(id, display_name, photo_url),
          team:teams!team_id(id, name),
          objective:okr_team_objectives!team_objective_id(id, title)
        `)
        .eq('id', krId)
        .maybeSingle();
        
      if (error) throw error;
      return data as unknown as TeamKeyResultData;
    },
    enabled: isReady && !!krId && !!supabase,
  });
}
