/**
 * useRitualEvaluationSummary
 *
 * Lê a view agregada `v_ritual_evaluation_summary` (médias das 4 dimensões
 * + counts) para um sessionId. Usado pelo histórico de ritos e pelo
 * resumo pós-fechamento exibido ao condutor.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { ritualEvaluationKeys } from '@/lib/queryKeys/ritualEvaluation';

export interface RitualEvaluationSummary {
  sessionId: string;
  responseCount: number;
  expectedCount: number;
  avgValue: number | null;
  avgQuality: number | null;
  avgDecisions: number | null;
  avgTime: number | null;
  evaluationOpenAt: string | null;
  evaluationClosedAt: string | null;
}

export function useRitualEvaluationSummary(sessionId: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ritualEvaluationKeys.summary(sessionId),
    queryFn: async (): Promise<RitualEvaluationSummary | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from('v_ritual_evaluation_summary')
        .select(
          'session_id, response_count, expected_count, avg_value, avg_quality, avg_decisions, avg_time, evaluation_open_at, evaluation_closed_at',
        )
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        sessionId: data.session_id as string,
        responseCount: Number(data.response_count ?? 0),
        expectedCount: Number(data.expected_count ?? 0),
        avgValue: data.avg_value === null ? null : Number(data.avg_value),
        avgQuality: data.avg_quality === null ? null : Number(data.avg_quality),
        avgDecisions: data.avg_decisions === null ? null : Number(data.avg_decisions),
        avgTime: data.avg_time === null ? null : Number(data.avg_time),
        evaluationOpenAt: (data.evaluation_open_at as string | null) ?? null,
        evaluationClosedAt: (data.evaluation_closed_at as string | null) ?? null,
      };
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}
