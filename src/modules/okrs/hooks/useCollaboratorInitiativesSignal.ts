/**
 * useCollaboratorInitiativesSignal — Sinal agregado (read-only) para o Step 1
 * do Check-in Individual: total e "em dia" de iniciativas onde o colaborador é
 * owner OU contributor no ciclo ativo.
 *
 * Reutiliza o mesmo contrato de filtro do `CollaboratorInitiativesStep`
 * (memória `collaborator-initiatives-step-scope`):
 *   - bu_id implícito via cliente BU-scoped
 *   - cycle_id via inner join em okr_team_key_results.team_objective
 *   - owner_user_id.eq OR contributors.cs.{userId}
 *   - deleted_at / cancelled_at IS NULL
 *
 * Projeção mínima — não invalida caches pesados.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

export interface CollaboratorInitiativesSignal {
  initiativesTotal: number;
  initiativesOnTrack: number;
  isLoading: boolean;
}

/**
 * Status considerados "em dia" para iniciativas. Mantém-se conservador:
 * apenas `at_risk` / `blocked` / `delayed` contam como atenção.
 */
const ATTENTION_STATUSES = new Set(['at_risk', 'blocked', 'delayed', 'red', 'yellow']);

export function useCollaboratorInitiativesSignal(
  effectiveUserId: string | null,
  cycleId: string | null,
): CollaboratorInitiativesSignal {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  const initiativesQuery = useQuery({
    queryKey: [
      ...queryKeys.okrs.initiativesForCollaborator(buId, cycleId, effectiveUserId),
      'opening-signal',
    ] as const,
    enabled: !!buId && !!effectiveUserId && !!cycleId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_initiatives')
        .select(
          'id, status, owner_user_id, contributors, kr:okr_team_key_results!inner(id, deleted_at, cancelled_at, team_objective:okr_team_objectives!inner(id, cycle_id, deleted_at, cancelled_at))',
        )
        .or(`owner_user_id.eq.${effectiveUserId!},contributors.cs.{${effectiveUserId!}}`)
        .eq('kr.team_objective.cycle_id', cycleId!)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .is('kr.deleted_at', null)
        .is('kr.cancelled_at', null)
        .is('kr.team_objective.deleted_at', null)
        .is('kr.team_objective.cancelled_at', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = initiativesQuery.data ?? [];
  const initiativesTotal = rows.length;
  const initiativesAttention = rows.filter((i) =>
    ATTENTION_STATUSES.has(String(i.status ?? '').toLowerCase()),
  ).length;

  return {
    initiativesTotal,
    initiativesOnTrack: Math.max(0, initiativesTotal - initiativesAttention),
    isLoading: initiativesQuery.isLoading,
  };
}
