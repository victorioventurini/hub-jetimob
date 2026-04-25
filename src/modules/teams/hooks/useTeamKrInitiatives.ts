/**
 * useTeamKrInitiatives
 *
 * Hook para a aba "Contribuição" do time. Lista iniciativas vinculadas
 * às KRs dos objetivos do time (ou sub-times) em um determinado ciclo.
 *
 * - Sem cycleId explícito → usa o ciclo ativo (useActiveCycle).
 * - Sem ciclo ativo nem cycleId → retorna lista vazia (com flag noCycle=true).
 * - Agrupa iniciativas por KR para visualização hierárquica.
 *
 * Reaproveita o tipo Initiative (incluindo enriquecimento de owner).
 *
 * Respeita: BU isolation, soft-delete, sem select('*'),
 * query keys via teamsKeys.contributionInitiatives.
 */
import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { teamsKeys } from '@/lib/queryKeys/teams';
import { useActiveCycle } from '@/modules/okrs/hooks/useActiveCycle';
import type { Initiative } from '@/modules/okrs/types/initiative';

export interface KrInitiativeGroup {
  kr: {
    id: string;
    title: string;
    objective_id: string;
    objective_title: string;
    team_id: string;
    team_name: string;
  };
  initiatives: Initiative[];
}

export interface UseTeamKrInitiativesResult {
  groups: KrInitiativeGroup[];
  totalInitiatives: number;
  totalKrs: number;
  cycleId: string | null;
  noCycle: boolean;
}

interface Options {
  resolvedTeamIds: string[];
  includeSubteams: boolean;
  /** Se vazio/undefined, cai para o ciclo ativo. */
  cycleId?: string | null;
}

export function useTeamKrInitiatives(
  teamId: string | undefined,
  { resolvedTeamIds, includeSubteams, cycleId }: Options
) {
  const { currentBu } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();
  const { activeCycle, isLoading: isLoadingActive } = useActiveCycle();

  const effectiveCycleId = (cycleId && cycleId.length > 0 ? cycleId : activeCycle?.id) ?? null;

  return useQuery({
    queryKey: teamsKeys.contributionInitiatives(
      teamId ?? null,
      currentBu?.id ?? null,
      includeSubteams,
      effectiveCycleId
    ),
    queryFn: async (): Promise<UseTeamKrInitiativesResult> => {
      if (!teamId || !currentBu?.id || !supabase || resolvedTeamIds.length === 0) {
        return {
          groups: [],
          totalInitiatives: 0,
          totalKrs: 0,
          cycleId: effectiveCycleId,
          noCycle: !effectiveCycleId,
        };
      }

      if (!effectiveCycleId) {
        return {
          groups: [],
          totalInitiatives: 0,
          totalKrs: 0,
          cycleId: null,
          noCycle: true,
        };
      }

      // 1) Objetivos do(s) time(s) no ciclo
      const { data: objs, error: objsErr } = await supabase
        .from('okr_team_objectives')
        .select('id, title, team_id')
        .eq('bu_id', currentBu.id)
        .in('team_id', resolvedTeamIds)
        .eq('cycle_id', effectiveCycleId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');
      if (objsErr) throw objsErr;

      const objectives = objs || [];
      if (objectives.length === 0) {
        return {
          groups: [],
          totalInitiatives: 0,
          totalKrs: 0,
          cycleId: effectiveCycleId,
          noCycle: false,
        };
      }

      const objectiveIds = objectives.map((o) => o.id);
      const objMap = new Map(objectives.map((o) => [o.id, o]));

      // 2) KRs dos objetivos
      const { data: krs, error: krsErr } = await supabase
        .from('okr_team_key_results')
        .select('id, title, team_objective_id')
        .in('team_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (krsErr) throw krsErr;

      const krList = krs || [];
      if (krList.length === 0) {
        return {
          groups: [],
          totalInitiatives: 0,
          totalKrs: 0,
          cycleId: effectiveCycleId,
          noCycle: false,
        };
      }

      const krIds = krList.map((k) => k.id);

      // 3) Iniciativas
      const { data: initsData, error: initsErr } = await supabase
        .from('okr_initiatives')
        .select(
          `id, bu_id, kr_id, name, description, status, priority, progress,
           owner_user_id, contributors, start_date, expected_end_date,
           notes, created_at, updated_at, deleted_at`
        )
        .in('kr_id', krIds)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (initsErr) throw initsErr;

      const initiatives = initsData || [];

      // 4) Owners (batch)
      const ownerIds = [...new Set(initiatives.map((i) => i.owner_user_id))];
      let ownerMap = new Map<string, Initiative['owner']>();
      if (ownerIds.length > 0) {
        const { data: owners, error: ownersErr } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, photo_url')
          .in('id', ownerIds);
        if (ownersErr) throw ownersErr;
        ownerMap = new Map(
          (owners || []).map((o) => [
            o.id,
            {
              id: o.id,
              display_name: o.display_name,
              first_name: o.first_name,
              last_name: o.last_name,
              photo_url: o.photo_url,
            },
          ])
        );
      }

      const enrichedInits: Initiative[] = initiatives.map((i) => ({
        ...i,
        owner: ownerMap.get(i.owner_user_id),
      }));

      // 5) Time names para o header dos cards (somente se include_subteams)
      let teamNameMap = new Map<string, string>();
      const teamIdsToLookup = [...new Set(objectives.map((o) => o.team_id))];
      if (teamIdsToLookup.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIdsToLookup);
        teamNameMap = new Map((teamsData || []).map((t) => [t.id, t.name]));
      }

      // 6) Agrupar por KR (somente KRs com >=1 iniciativa)
      const initsByKr = new Map<string, Initiative[]>();
      for (const init of enrichedInits) {
        const arr = initsByKr.get(init.kr_id) || [];
        arr.push(init);
        initsByKr.set(init.kr_id, arr);
      }

      const groups: KrInitiativeGroup[] = krList
        .filter((kr) => initsByKr.has(kr.id))
        .map((kr) => {
          const obj = objMap.get(kr.team_objective_id);
          return {
            kr: {
              id: kr.id,
              title: kr.title,
              objective_id: kr.team_objective_id,
              objective_title: obj?.title ?? '',
              team_id: obj?.team_id ?? '',
              team_name: obj?.team_id ? teamNameMap.get(obj.team_id) ?? '' : '',
            },
            initiatives: initsByKr.get(kr.id) || [],
          };
        });

      return {
        groups,
        totalInitiatives: enrichedInits.length,
        totalKrs: groups.length,
        cycleId: effectiveCycleId,
        noCycle: false,
      };
    },
    enabled:
      !!teamId &&
      !!currentBu?.id &&
      isReady &&
      !!supabase &&
      resolvedTeamIds.length > 0 &&
      !isLoadingActive,
    staleTime: 2 * 60 * 1000,
  });
}
