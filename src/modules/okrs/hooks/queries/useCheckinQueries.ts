/**
 * Check-in Queries
 * 
 * Queries for OKR check-ins.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// ============================================================
// QUERIES
// ============================================================

export function useKrCheckins(krId: string) {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.checkins(krId),
    queryFn: async () => {
      if (!supabase || !buId) return [];
      
      const { data, error } = await supabase
        .from('okr_checkins')
        .select(OKR_FIELDS.checkin)
        .eq('kr_id', krId)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!krId && !!buId && !!supabase,
    staleTime: OKR_STALE_TIME.checkin,
  });
}

export function useLatestCheckinDate() {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.latestCheckin(),
    queryFn: async () => {
      if (!supabase || !buId) return null;
      
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.created_at;
    },
    enabled: !!buId && !!supabase,
    staleTime: OKR_STALE_TIME.checkin,
  });
}
