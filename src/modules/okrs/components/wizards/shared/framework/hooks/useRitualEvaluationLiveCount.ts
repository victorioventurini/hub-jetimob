/**
 * useRitualEvaluationLiveCount
 *
 * Polling do contador "X de Y" durante a coleta. Chama RPC
 * `get_ritual_evaluation_live_count` a cada 3 segundos.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { ritualEvaluationKeys } from '@/lib/queryKeys/ritualEvaluation';

export interface RitualEvaluationLiveCount {
  responseCount: number;
  expectedCount: number;
}

export function useRitualEvaluationLiveCount(
  sessionId: string | null,
  options?: { enabled?: boolean; pollMs?: number },
) {
  const supabase = useBuScopedSupabase();
  const enabled = options?.enabled !== false && !!sessionId;
  const pollMs = options?.pollMs ?? 3000;

  return useQuery({
    queryKey: ritualEvaluationKeys.liveCount(sessionId),
    queryFn: async (): Promise<RitualEvaluationLiveCount> => {
      if (!sessionId) return { responseCount: 0, expectedCount: 0 };
      const { data, error } = await supabase.rpc('get_ritual_evaluation_live_count', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { response_count?: number; expected_count?: number };
      return {
        responseCount: Number(payload.response_count ?? 0),
        expectedCount: Number(payload.expected_count ?? 0),
      };
    },
    enabled,
    refetchInterval: enabled ? pollMs : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
