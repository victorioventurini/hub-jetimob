/**
 * useOpenCloseRitualEvaluation
 *
 * Mutations para o condutor:
 *  - `open` → gera short-code, retorna o código
 *  - `close` → encerra coleta
 *
 * Invalida queries `ritualEvaluation` para a sessão.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { ritualEvaluationKeys } from '@/lib/queryKeys/ritualEvaluation';
import { toast } from 'sonner';

export function useOpenRitualEvaluation() {
  const supabase = useBuScopedSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<{ shortCode: string }> => {
      const { data, error } = await supabase.rpc('open_ritual_evaluation', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { short_code?: string };
      if (!payload.short_code) throw new Error('Falha ao gerar código de avaliação');
      return { shortCode: payload.short_code };
    },
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ritualEvaluationKeys.summary(sessionId) });
      qc.invalidateQueries({ queryKey: ritualEvaluationKeys.liveCount(sessionId) });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao abrir avaliação: ${err.message}`);
    },
  });
}

export function useCloseRitualEvaluation() {
  const supabase = useBuScopedSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc('close_ritual_evaluation', {
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ritualEvaluationKeys.summary(sessionId) });
      qc.invalidateQueries({ queryKey: ritualEvaluationKeys.liveCount(sessionId) });
      qc.invalidateQueries({ queryKey: ritualEvaluationKeys.openAnswers(sessionId) });
      toast.success('Coleta encerrada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao encerrar coleta: ${err.message}`);
    },
  });
}
