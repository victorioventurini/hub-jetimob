/**
 * useSelectedTeamCheckinAgenda
 *
 * Lê o último `leader-prep` (status='completed') do time/ciclo, extrai os
 * `selectedTeamCheckinAgendaSuggestionIds`, e cruza com as sugestões agregadas
 * dos check-ins individuais (`useTeamCollaboratorAgendaSuggestions`) para
 * produzir a lista final de pauta a ser exibida na abertura do Check-in
 * do Time.
 *
 * Não duplica lógica: reutiliza `useTeamCollaboratorAgendaSuggestions`.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import {
  useTeamCollaboratorAgendaSuggestions,
  type AggregatedAgendaSuggestion,
} from './useTeamCollaboratorAgendaSuggestions';

interface UseSelectedTeamCheckinAgendaOptions {
  teamId: string | null | undefined;
  cycleId: string | null | undefined;
  enabled?: boolean;
}

function useLatestLeaderPrepSelection({
  teamId,
  cycleId,
  enabled = true,
}: UseSelectedTeamCheckinAgendaOptions) {
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['team-checkin-agenda-selection', currentBuId, teamId ?? null, cycleId ?? null],
    enabled: !!currentBuId && !!teamId && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, completed_at, reflection_data')
        .eq('wizard_type', 'leader-prep')
        .eq('status', 'completed')
        .eq('team_id', teamId!)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (cycleId) query = query.eq('cycle_id', cycleId);

      const { data, error } = await query;
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return [];
      const inner = ((row as { reflection_data?: { data?: Record<string, unknown> } })
        .reflection_data?.data ?? {}) as Record<string, unknown>;
      const ids = inner.selectedTeamCheckinAgendaSuggestionIds;
      return Array.isArray(ids) ? (ids as string[]) : [];
    },
  });
}

export function useSelectedTeamCheckinAgenda({
  teamId,
  cycleId,
  enabled = true,
}: UseSelectedTeamCheckinAgendaOptions): {
  prioritized: AggregatedAgendaSuggestion[];
  others: AggregatedAgendaSuggestion[];
  isLoading: boolean;
} {
  const { data: selectedIds = [], isLoading: isLoadingIds } = useLatestLeaderPrepSelection({
    teamId,
    cycleId,
    enabled,
  });
  const { data: allSuggestions = [], isLoading: isLoadingSuggestions } =
    useTeamCollaboratorAgendaSuggestions({ teamId, cycleId, enabled });

  return useMemo(() => {
    const idSet = new Set(selectedIds);
    const prioritized: AggregatedAgendaSuggestion[] = [];
    const others: AggregatedAgendaSuggestion[] = [];
    for (const s of allSuggestions) {
      if (idSet.has(s.id)) prioritized.push(s);
      else others.push(s);
    }
    return {
      prioritized,
      others,
      isLoading: isLoadingIds || isLoadingSuggestions,
    };
  }, [selectedIds, allSuggestions, isLoadingIds, isLoadingSuggestions]);
}
