/**
 * useDecisionThread - Hook para adicionar mensagens à thread de uma decisão/registro.
 * 
 * Padrão: fetch session → merge thread → update JSONB.
 * Reutiliza a mesma lógica de useUpdateDecisionFollowUp.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import type { TeamCheckinDecision, DecisionThreadMessage } from '../types/wizard';

export function useDecisionThread() {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const { profileId } = useIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      decisionId,
      content,
    }: {
      sessionId: string;
      decisionId: string;
      content: string;
    }) => {
      if (!buSupabase) throw new Error('No supabase client');
      if (!profileId) throw new Error('No profile');

      // Fetch current session decisions
      const { data: session, error: fetchErr } = await buSupabase
        .from('okr_wizard_sessions')
        .select('decisions, reflection_data')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      const newMessage: DecisionThreadMessage = {
        id: crypto.randomUUID(),
        content,
        authorId: profileId,
        authorName: 'Usuário', // Name resolved at render time via OwnerNameResolved
        createdAt: new Date().toISOString(),
      };

      // Update in decisions array
      const currentDecisions = Array.isArray(session.decisions)
        ? (session.decisions as unknown as TeamCheckinDecision[])
        : [];

      const updatedDecisions = currentDecisions.map(d => {
        if (d.id !== decisionId) return d;
        const existingThread = d.thread ?? [];
        return { ...d, thread: [...existingThread, newMessage] };
      });

      // Also update in reflection_data if decisions exist there
      let updatedReflectionData = session.reflection_data;
      if (updatedReflectionData && typeof updatedReflectionData === 'object') {
        const rd = updatedReflectionData as Record<string, unknown>;
        if (rd.data && typeof rd.data === 'object') {
          const data = rd.data as Record<string, unknown>;
          if (Array.isArray(data.decisions)) {
            data.decisions = (data.decisions as any[]).map((d: any) => {
              if (d.id !== decisionId) return d;
              const existingThread = d.thread ?? [];
              return { ...d, thread: [...existingThread, newMessage] };
            });
            updatedReflectionData = { ...rd, data: { ...data } } as any;
          }
        }
      }

      const { error } = await buSupabase
        .from('okr_wizard_sessions')
        .update({
          decisions: updatedDecisions as any,
          reflection_data: updatedReflectionData,
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.okrs.ritualHistoryListPrefix(currentBu?.id ?? null),
      });
    },
  });
}
