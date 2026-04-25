/**
 * useTeamContributionAnalytics
 *
 * Hook agregador para a aba "Contribuição" do time.
 * Retorna métricas combinadas: OKRs próprios, OKRs compartilhados (recebidos/contribuídos),
 * Org Objectives impactados, projetos ativos vinculados a KRs e série de evolução
 * (média de confidence dos check-ins recentes mapeada para 0-100).
 *
 * Respeita:
 * - BU isolation (useBuScopedSupabase via useOptionalBuClient)
 * - Soft-delete (.is('deleted_at', null))
 * - Sem select('*')
 * - Query keys via prefix helpers (teamsKeys.contributionAnalytics)
 */
import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { teamsKeys } from '@/lib/queryKeys/teams';

export interface TeamContributionAnalytics {
  ownObjectivesCount: number;
  ownKrsCount: number;
  sharedReceivedCount: number;
  sharedContributedCount: number;
  orgObjectivesImpactedCount: number;
  activeProjectsCount: number;
  healthSeries: Array<{ date: string; value: number }>;
  resolvedTeamIds: string[];
}

const CONFIDENCE_TO_SCORE: Record<string, number> = {
  high: 100,
  medium: 66,
  low: 33,
};

interface Options {
  includeSubteams: boolean;
  cycleId?: string | null;
}

/**
 * Resolve descendentes recursivamente via parent_team_id
 * (versão client-side; respeita BU via cliente scoped)
 */
async function resolveTeamIdsWithDescendants(
  supabase: NonNullable<ReturnType<typeof useOptionalBuClient>['client']>,
  rootTeamId: string,
  buId: string,
  includeSubteams: boolean
): Promise<string[]> {
  if (!includeSubteams) return [rootTeamId];

  const { data: allTeams, error } = await supabase
    .from('teams')
    .select('id, parent_team_id')
    .eq('bu_id', buId)
    .is('deleted_at', null);

  if (error || !allTeams) return [rootTeamId];

  // BFS para descendentes
  const childrenMap = new Map<string, string[]>();
  for (const t of allTeams) {
    if (!t.parent_team_id) continue;
    const arr = childrenMap.get(t.parent_team_id) || [];
    arr.push(t.id);
    childrenMap.set(t.parent_team_id, arr);
  }

  const result = new Set<string>([rootTeamId]);
  const queue = [rootTeamId];
  while (queue.length > 0) {
    const next = queue.shift()!;
    const children = childrenMap.get(next) || [];
    for (const c of children) {
      if (!result.has(c)) {
        result.add(c);
        queue.push(c);
      }
    }
  }
  return Array.from(result);
}

export function useTeamContributionAnalytics(
  teamId: string | undefined,
  options: Options
) {
  const { currentBu } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();
  const { includeSubteams, cycleId } = options;

  return useQuery({
    queryKey: teamsKeys.contributionAnalytics(
      teamId ?? null,
      currentBu?.id ?? null,
      includeSubteams,
      cycleId
    ),
    queryFn: async (): Promise<TeamContributionAnalytics | null> => {
      if (!teamId || !currentBu?.id || !supabase) return null;

      const teamIds = await resolveTeamIdsWithDescendants(
        supabase,
        teamId,
        currentBu.id,
        includeSubteams
      );

      // 1) OKRs próprios (objetivos onde team_id está em teamIds)
      let ownObjQuery = supabase
        .from('okr_team_objectives')
        .select('id, team_id', { count: 'exact' })
        .eq('bu_id', currentBu.id)
        .in('team_id', teamIds)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');
      if (cycleId) ownObjQuery = ownObjQuery.eq('cycle_id', cycleId);
      const { data: ownObjs, error: ownObjErr } = await ownObjQuery;
      if (ownObjErr) throw ownObjErr;

      const ownObjectiveIds = (ownObjs || []).map((o) => o.id);

      // 2) KRs próprios
      let ownKrsCount = 0;
      let krIds: string[] = [];
      if (ownObjectiveIds.length > 0) {
        const { data: krs, error: krsErr } = await supabase
          .from('okr_team_key_results')
          .select('id')
          .in('team_objective_id', ownObjectiveIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);
        if (krsErr) throw krsErr;
        ownKrsCount = krs?.length ?? 0;
        krIds = (krs || []).map((k) => k.id);
      }

      // 3) Compartilhados RECEBIDOS — objetivos do time com is_shared=true
      const { data: sharedReceived, error: sharedRecErr } = await supabase
        .from('okr_team_objectives')
        .select('id')
        .eq('bu_id', currentBu.id)
        .in('team_id', teamIds)
        .eq('is_shared', true)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (sharedRecErr) throw sharedRecErr;

      // 4) Compartilhados CONTRIBUÍDOS — objetivos de outros times onde este time é contribuidor
      const { data: contribLinks, error: contribErr } = await supabase
        .from('okr_team_objective_contributors')
        .select('objective_id')
        .in('team_id', teamIds);
      if (contribErr) throw contribErr;

      let sharedContributedCount = 0;
      if (contribLinks && contribLinks.length > 0) {
        const objIds = [...new Set(contribLinks.map((c) => c.objective_id))];
        const { data: contribObjs, error: contribObjsErr } = await supabase
          .from('okr_team_objectives')
          .select('id, team_id')
          .in('id', objIds)
          .not('team_id', 'in', `(${teamIds.map((id) => `"${id}"`).join(',')})`)
          .is('deleted_at', null)
          .is('cancelled_at', null);
        if (contribObjsErr) throw contribObjsErr;
        sharedContributedCount = contribObjs?.length ?? 0;
      }

      // 5) Org Objectives impactados — via team_krs com linked_org_kr_id
      let orgObjectivesImpactedCount = 0;
      if (krIds.length > 0) {
        const { data: linkedKrs, error: linkedErr } = await supabase
          .from('okr_team_key_results')
          .select('linked_org_kr_id')
          .in('id', krIds)
          .not('linked_org_kr_id', 'is', null);
        if (linkedErr) throw linkedErr;
        const orgKrIds = [
          ...new Set(
            (linkedKrs || [])
              .map((k) => k.linked_org_kr_id)
              .filter(Boolean) as string[]
          ),
        ];
        if (orgKrIds.length > 0) {
          const { data: orgKrs } = await supabase
            .from('okr_org_key_results')
            .select('org_objective_id')
            .in('id', orgKrIds)
            .is('deleted_at', null);
          const orgObjIds = new Set(
            (orgKrs || []).map((k) => k.org_objective_id).filter(Boolean)
          );
          orgObjectivesImpactedCount = orgObjIds.size;
        }
      }

      // 6) Projetos ativos vinculados a KRs do time
      let activeProjectsCount = 0;
      if (krIds.length > 0) {
        const { data: projectKrs } = await supabase
          .from('project_key_results')
          .select('project_id')
          .in('key_result_id', krIds);
        const projectIds = [
          ...new Set((projectKrs || []).map((p) => p.project_id)),
        ];
        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, status')
            .in('id', projectIds)
            .is('deleted_at', null)
            .in('status', ['planned', 'in_progress', 'at_risk']);
          activeProjectsCount = projects?.length ?? 0;
        }
      }

      // 7) Health series — últimos 60 dias, agregação diária
      let healthSeries: Array<{ date: string; value: number }> = [];
      if (krIds.length > 0) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 60);
        const { data: checkins } = await supabase
          .from('okr_checkins')
          .select('date, confidence')
          .in('kr_id', krIds)
          .gte('date', sinceDate.toISOString().slice(0, 10))
          .order('date', { ascending: true });

        const byDate = new Map<string, { sum: number; count: number }>();
        for (const c of checkins || []) {
          const score = CONFIDENCE_TO_SCORE[c.confidence as string] ?? 0;
          const cur = byDate.get(c.date) || { sum: 0, count: 0 };
          cur.sum += score;
          cur.count += 1;
          byDate.set(c.date, cur);
        }
        healthSeries = Array.from(byDate.entries())
          .map(([date, { sum, count }]) => ({
            date,
            value: count > 0 ? Math.round(sum / count) : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      return {
        ownObjectivesCount: ownObjs?.length ?? 0,
        ownKrsCount,
        sharedReceivedCount: sharedReceived?.length ?? 0,
        sharedContributedCount,
        orgObjectivesImpactedCount,
        activeProjectsCount,
        healthSeries,
        resolvedTeamIds: teamIds,
      };
    },
    enabled: !!teamId && !!currentBu?.id && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}
