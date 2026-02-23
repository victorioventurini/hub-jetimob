/**
 * useLastCompletedSession - Consulta a data do último check-in completado
 * 
 * Busca a sessão mais recente com status 'completed' para um wizard_type,
 * opcionalmente filtrada por team_id.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';

interface UseLastCompletedSessionResult {
  lastCompletedAt: string | null;
  isLoading: boolean;
}

export function useLastCompletedSession(
  wizardType: string,
  teamId?: string | null
): UseLastCompletedSessionResult {
  const supabase = useBuScopedSupabase();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.okrs.lastCompletedSession(wizardType, teamId),
    queryFn: async () => {
      let query = supabase
        .from('okr_wizard_sessions')
        .select('completed_at')
        .eq('wizard_type', wizardType)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data?.completed_at ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    lastCompletedAt: data ?? null,
    isLoading,
  };
}
