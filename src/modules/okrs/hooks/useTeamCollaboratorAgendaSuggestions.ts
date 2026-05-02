/**
 * useTeamCollaboratorAgendaSuggestions
 *
 * Agrega as sugestões de pauta (`teamCheckinAgendaSuggestions`) registradas
 * pelos colaboradores no Reflection do Check-in Individual, lendo snapshots
 * completados em `okr_wizard_sessions`.
 *
 * Escopo:
 * - BU: filtro mandatório via `currentBuId` (mem://standards/bu-isolation-master).
 * - Time: `team_id = teamId`.
 * - Janela: sessões concluídas dentro do ciclo ativo (`cycleId`) — usa
 *   `cycle_id` quando presente; fallback para `completed_at` >= início do ciclo.
 * - Wizard type: `'collaborator'` (legacy) e `'collaborator-checkin'` (novo
 *   ID, caso evolua) — busca em ambos por segurança.
 *
 * Retorna sugestões enriquecidas com o nome do colaborador autor para
 * exibição na preparação do líder.
 *
 * Não há duplicação: este hook segue o mesmo padrão de `useWeeklySources`
 * (PreWeeklySourcesStep) e `useTeamPendingKrs` — leitura BU-scoped via
 * `useBuScopedSupabase`.
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

export interface AggregatedAgendaSuggestion extends RitualAgendaSuggestion {
  /** profileId do colaborador autor da sessão */
  authorId: string;
  /** Nome do autor (full_name) — fallback: 'Colaborador' */
  authorName: string;
  /** sessionId de origem (rastreio) */
  sessionId: string;
  /** completed_at da sessão (ISO) */
  sessionCompletedAt: string;
}

interface UseTeamCollaboratorAgendaSuggestionsOptions {
  teamId: string | null | undefined;
  cycleId: string | null | undefined;
  enabled?: boolean;
}

export function useTeamCollaboratorAgendaSuggestions({
  teamId,
  cycleId,
  enabled = true,
}: UseTeamCollaboratorAgendaSuggestionsOptions) {
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: okrsKeys.teamCollaboratorAgendaSuggestions(currentBuId, teamId ?? null, cycleId ?? null),
    enabled: !!currentBuId && !!teamId && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AggregatedAgendaSuggestion[]> => {
      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, wizard_type, completed_at, started_by, reflection_data, cycle_id, team_id')
        .in('wizard_type', ['collaborator', 'collaborator-checkin'])
        .eq('status', 'completed')
        .eq('team_id', teamId!)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data: sessions, error } = await query;
      if (error) throw error;

      const aggregated: Omit<AggregatedAgendaSuggestion, 'authorName'>[] = [];
      const authorIds = new Set<string>();

      for (const row of sessions ?? []) {
        const inner = ((row as { reflection_data?: { data?: Record<string, unknown> } })
          .reflection_data?.data ?? {}) as Record<string, unknown>;
        const list = Array.isArray(inner.teamCheckinAgendaSuggestions)
          ? (inner.teamCheckinAgendaSuggestions as RitualAgendaSuggestion[])
          : [];
        if (list.length === 0) continue;
        const authorId = (row as { started_by: string | null }).started_by ?? 'unknown';
        if (authorId !== 'unknown') authorIds.add(authorId);
        for (const s of list) {
          if (!s || typeof s.text !== 'string' || !s.text.trim()) continue;
          aggregated.push({
            ...s,
            authorId,
            sessionId: (row as { id: string }).id,
            sessionCompletedAt: (row as { completed_at: string }).completed_at,
          });
        }
      }

      // Resolve author names em batch
      let nameMap: Record<string, string> = {};
      if (authorIds.size > 0) {
        const { data: profiles } = await buSupabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(authorIds));
        nameMap = Object.fromEntries(
          (profiles ?? []).map((p) => [p.id as string, (p.full_name as string) || 'Colaborador']),
        );
      }

      return aggregated.map((s) => ({
        ...s,
        authorName: nameMap[s.authorId] ?? 'Colaborador',
      }));
    },
  });
}
