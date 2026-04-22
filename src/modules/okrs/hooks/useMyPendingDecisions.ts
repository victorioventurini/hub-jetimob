/**
 * useMyPendingDecisions - Busca decisões/registros pendentes atribuídos ao usuário efetivo.
 * 
 * Consulta okr_wizard_sessions com status 'completed' e filtra client-side
 * decisões onde owner.id === effectiveUserId e followUpStatus !== 'done'.
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { extractAllDecisions } from '../lib/extractDecisions';
import type { TeamCheckinDecision } from '../types/wizard';

export interface PendingDecisionItem {
  decision: TeamCheckinDecision & { followUpStatus?: string };
  sessionId: string;
  sessionType: string;
  sessionCompletedAt: string | null;
}

export function useMyPendingDecisions(effectiveUserId: string | null) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  return useQuery<PendingDecisionItem[]>({
    queryKey: [...queryKeys.okrs.ritualHistoryListPrefix(currentBu?.id ?? null), 'my-pending-decisions', effectiveUserId],
    queryFn: async (): Promise<PendingDecisionItem[]> => {
      if (!buSupabase || !effectiveUserId || !currentBu?.id) return [];

      // Fetch completed sessions that have decisions
      const { data: sessions, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, wizard_type, completed_at, decisions, reflection_data')
        .eq('bu_id', currentBu.id)
        .eq('status', 'completed')
        .not('decisions', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!sessions) return [];

      const items: PendingDecisionItem[] = [];

      for (const session of sessions) {
        const decisions = extractAllDecisions(session);
        for (const d of decisions) {
          const dec = d as TeamCheckinDecision & { followUpStatus?: string };
          if (
            dec.owner?.id === effectiveUserId &&
            dec.followUpStatus !== 'done'
          ) {
            items.push({
              decision: dec,
              sessionId: session.id,
              sessionType: session.wizard_type,
              sessionCompletedAt: session.completed_at,
            });
          }
        }
      }

      return items;
    },
    enabled: !!buSupabase && !!effectiveUserId && !!currentBu?.id,
    staleTime: 2 * 60 * 1000,
  });
}

