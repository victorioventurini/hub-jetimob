/**
 * useTeamResponsibilityScope — Resolve a árvore de times (time + descendentes)
 * e o conjunto de membros responsáveis (líderes + memberships) para um teamId.
 *
 * Usado por ritos (Pré-MBR, Pré-QBR) para filtrar projetos/milestones por
 * responsabilidade direta do time ou de subtimes.
 *
 * - BU isolation: queries via `useBuScopedSupabase`.
 * - Sem mutations; somente leitura.
 * - Profundidade típica da árvore ≤ 3 (BU → Time → Subtime → Squad).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';

export interface TeamResponsibilityScope {
  teamIds: string[];
  /** profiles.id de todos os responsáveis (líderes + memberships) do time + subtimes. */
  memberProfileIds: Set<string>;
  isLoading: boolean;
}

export function useTeamResponsibilityScope(
  teamId: string | null | undefined,
): TeamResponsibilityScope {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const { data, isLoading } = useQuery({
    queryKey: ['team-responsibility-scope', 'v1', currentBuId, teamId],
    enabled: !!supabase && !!currentBuId && !!teamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // BFS pela árvore de times via parent_team_id (sem migração)
      const teamIds: string[] = [teamId!];
      const leaders: string[] = [];

      // Carrega raiz para pegar leader
      const { data: root, error: rootErr } = await supabase
        .from('teams')
        .select('id, leader_user_id')
        .eq('id', teamId!)
        .maybeSingle();
      if (rootErr) throw rootErr;
      if (root?.leader_user_id) leaders.push(root.leader_user_id);

      // Itera descendentes
      let frontier: string[] = [teamId!];
      while (frontier.length > 0) {
        const { data: children, error } = await supabase
          .from('teams')
          .select('id, leader_user_id')
          .in('parent_team_id', frontier);
        if (error) throw error;
        const next: string[] = [];
        for (const c of children ?? []) {
          if (!teamIds.includes(c.id)) {
            teamIds.push(c.id);
            next.push(c.id);
            if (c.leader_user_id) leaders.push(c.leader_user_id);
          }
        }
        frontier = next;
      }

      // Memberships diretos
      const { data: memberships, error: memErr } = await supabase
        .from('user_team_memberships')
        .select('user_id')
        .in('team_id', teamIds);
      if (memErr) throw memErr;

      const members = new Set<string>(leaders);
      for (const m of memberships ?? []) {
        if (m.user_id) members.add(m.user_id);
      }

      return { teamIds, memberIds: Array.from(members) };
    },
  });

  return useMemo<TeamResponsibilityScope>(
    () => ({
      teamIds: data?.teamIds ?? [],
      memberProfileIds: new Set(data?.memberIds ?? []),
      isLoading,
    }),
    [data, isLoading],
  );
}
