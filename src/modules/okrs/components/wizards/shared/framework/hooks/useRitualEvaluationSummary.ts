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
  evaluationShortCode: string | null;
}

export function useRitualEvaluationSummary(sessionId: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ritualEvaluationKeys.summary(sessionId),
    queryFn: async (): Promise<RitualEvaluationSummary | null> => {
      if (!sessionId) return null;
      // Usamos a RPC SECURITY DEFINER (não a view) porque a base
      // `ritual_evaluation_responses` tem `SELECT USING(false)` para garantir
      // anonimato — qualquer leitura via view (security_invoker) zera a contagem.
      // A RPC valida BU + permission key `okrs.evaluation.view:as_conductor`.
      const { data, error } = await supabase.rpc('get_ritual_evaluation_summary', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
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
        evaluationShortCode: (data.evaluation_short_code as string | null) ?? null,
      };
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

