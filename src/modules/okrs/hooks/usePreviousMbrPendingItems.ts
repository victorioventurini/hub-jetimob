/**
 * usePreviousMbrPendingItems
 *
 * Re-deriva os itens pendentes do MBR anterior (decisões com categoria
 * `next_step` ou `focus_adjustment`) a partir de `okr_wizard_sessions`.
 *
 * Substitui o campo `MbrDraftData.previousMbrPendingItems`, que antes era
 * hidratado uma única vez no draft. Agora a leitura é sob demanda — sessões
 * antigas continuam funcionando porque o renderer de histórico ainda lê o
 * campo legado em `reflection_data` quando presente.
 *
 * Escopo: BU-isolated automaticamente (usa `useBuScopedSupabase`).
 */
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import type { TeamCheckinDecision, MbrDraftData } from '@/modules/okrs/types/wizard';

export function usePreviousMbrPendingItems(currentMbrSessionId?: string | null) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery<TeamCheckinDecision[]>({
    queryKey: mbrKeys.previousPendingItems(buId, currentMbrSessionId ?? null),
    enabled: !!buId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, reflection_data')
        .eq('wizard_type', 'mbr')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(2); // pega as 2 últimas (skip a corrente caso esteja completed)

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Pula a sessão atual se estiver na lista (caso já completed)
      const previous = data.find((s) => s.id !== currentMbrSessionId) ?? null;
      if (!previous?.reflection_data) return [];

      const prevData = (previous.reflection_data as { data?: MbrDraftData })?.data;
      if (!prevData?.decisions) return [];

      return prevData.decisions.filter(
        (d) => d.category === 'next_step' || d.category === 'focus_adjustment',
      );
    },
  });
}
