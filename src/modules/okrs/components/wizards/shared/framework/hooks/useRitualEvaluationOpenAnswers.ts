/**
 * useRitualEvaluationOpenAnswers
 *
 * Lê as respostas abertas (citações anônimas) APÓS o fechamento da coleta.
 * A RPC backing já valida permissão `okrs.evaluation.view:as_conductor` e
 * recusa execução se a sessão ainda estiver aberta.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { ritualEvaluationKeys } from '@/lib/queryKeys/ritualEvaluation';

export interface RitualEvaluationOpenAnswer {
  changeOneThing: string;
  whatWorked: string | null;
}

export function useRitualEvaluationOpenAnswers(
  sessionId: string | null,
  options?: { enabled?: boolean },
) {
  const supabase = useBuScopedSupabase();
  const enabled = options?.enabled !== false && !!sessionId;

  return useQuery({
    queryKey: ritualEvaluationKeys.openAnswers(sessionId),
    queryFn: async (): Promise<RitualEvaluationOpenAnswer[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase.rpc('get_ritual_evaluation_open_answers', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return (data ?? []).map((row: { change_one_thing: string; what_worked: string | null }) => ({
        changeOneThing: row.change_one_thing,
        whatWorked: row.what_worked,
      }));
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
