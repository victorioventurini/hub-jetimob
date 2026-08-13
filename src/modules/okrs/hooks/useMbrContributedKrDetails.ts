/**
 * useMbrContributedKrDetails — resolve título do KR, título do objetivo e nome
 * do time dono para os `krFinalStates` marcados como `isContributed` no
 * Pré-MBR.
 *
 * Necessário porque times sem OKRs próprias entram na pauta do MBR pelo
 * Pré-MBR enviado: a única leitura de OKR disponível são KRs de objetivos de
 * outros times nos quais o time contribui. Os snapshots não persistem mais
 * títulos (Onda 4 F3), então resolvemos por lookup BU-scoped.
 *
 * Somente leitura, colunas explícitas, BU-isolated.
 */
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';

export interface ContributedKrDetail {
  krId: string;
  krTitle: string;
  objectiveId: string | null;
  objectiveTitle: string | null;
  ownerTeamName: string | null;
}

interface KrRow {
  id: string;
  title: string;
  team_objective_id: string | null;
  okr_team_objectives: {
    id: string;
    title: string;
    teams: { name: string } | null;
  } | null;
}

export function useMbrContributedKrDetails(krIds: string[]) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const buId = currentBu?.id ?? null;

  const uniqueIds = Array.from(new Set(krIds.filter(Boolean))).sort();
  const krIdsKey = uniqueIds.join(',');

  return useQuery<Map<string, ContributedKrDetail>>({
    queryKey: mbrKeys.contributedKrDetails(buId, krIdsKey),
    enabled: !!buId && uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_key_results')
        .select(
          'id, title, team_objective_id, okr_team_objectives!inner(id, title, teams(name))',
        )
        .in('id', uniqueIds)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .returns<KrRow[]>();

      if (error) throw error;

      const map = new Map<string, ContributedKrDetail>();
      for (const row of data ?? []) {
        map.set(row.id, {
          krId: row.id,
          krTitle: row.title,
          objectiveId: row.team_objective_id,
          objectiveTitle: row.okr_team_objectives?.title ?? null,
          ownerTeamName: row.okr_team_objectives?.teams?.name ?? null,
        });
      }
      return map;
    },
  });
}
