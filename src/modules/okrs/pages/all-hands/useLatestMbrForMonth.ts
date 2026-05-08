/**
 * useLatestMbrForMonth — Última sessão MBR concluída de um mês de referência.
 *
 * Critério: `wizard_type='mbr'`, `status='completed'`, payload com
 * `referenceMonth` matching. Retorna sessão + payload tipado para hidratar o
 * All Hands em modo read-only.
 *
 * BU isolation: via `useBuScopedSupabase`.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { MbrDraftData } from '@/modules/okrs/types/wizard';

export interface LatestMbrForMonth {
  sessionId: string;
  completedAt: string;
  startedBy: string;
  payload: MbrDraftData;
}

export function useLatestMbrForMonth(referenceMonth: string | null | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: queryKeys.okrs.lastCompletedSession('mbr', `month:${referenceMonth ?? 'none'}`),
    enabled: !!buId && !!referenceMonth,
    queryFn: async (): Promise<LatestMbrForMonth | null> => {
      if (!referenceMonth) return null;

      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('id, completed_at, started_by, reflection_data')
        .eq('wizard_type', 'mbr')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const match = data.find((row) => {
        const p = (row.reflection_data ?? {}) as Partial<MbrDraftData>;
        return typeof p.referenceMonth === 'string' && p.referenceMonth === referenceMonth;
      });

      if (!match) return null;
      return {
        sessionId: match.id,
        completedAt: match.completed_at as string,
        startedBy: match.started_by as string,
        payload: (match.reflection_data ?? {}) as unknown as MbrDraftData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
