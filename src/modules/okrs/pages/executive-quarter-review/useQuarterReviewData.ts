import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAfter, isBefore, parseISO, subDays } from 'date-fns';

import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { quarterReviewKeys } from '@/lib/queryKeys/okrs';
import { useKpiData } from '@/modules/kpis/hooks/useKpiData';
import { useProjects } from '@/modules/projects/hooks';
import { useTeams } from '@/modules/okrs/hooks';
import { calculateProgress } from '@/modules/okrs/types';

import type {
  AreaGroup,
  QuarterCycle,
  RitualSessionRow,
  TeamObjectiveRow,
  TeamStat,
} from './types';

interface Args {
  selectedCycleId: string;
}

export function useQuarterReviewData({ selectedCycleId }: Args) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const cyclesQuery = useQuery({
    queryKey: quarterReviewKeys.cycles(currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, start_date, end_date, status, qbr_status')
        .eq('bu_id', currentBuId!)
        .eq('type', 'quarter')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as QuarterCycle[];
    },
    enabled: !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  const objectivesQuery = useQuery({
    queryKey: quarterReviewKeys.teamObjectives(currentBuId, selectedCycleId || undefined),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select(`
          id, title, team_id,
          team:teams!okr_team_objectives_team_id_fkey(
            id, name, area_id,
            area:areas!teams_area_id_fkey(id, name, color)
          ),
          key_results:okr_team_key_results(
            id, title, baseline, current_value, target, direction, unit, status, last_checkin_at, deleted_at, cancelled_at
          )
        `)
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', selectedCycleId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');
      if (error) throw error;

      return ((data || []) as any[]).map((obj) => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at,
        ),
      })) as TeamObjectiveRow[];
    },
    enabled: !!currentBuId && !!selectedCycleId,
    staleTime: 2 * 60 * 1000,
  });

  const ritualsQuery = useQuery({
    queryKey: quarterReviewKeys.ritualSessions(currentBuId, selectedCycleId || undefined),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select(
          'id, team_id, wizard_type, completed_at, decisions, reflection_data, addendums',
        )
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', selectedCycleId)
        .eq('status', 'completed')
        .in('wizard_type', [
          'qbr-pre',
          'qbr-pre-clevel',
          'qbr-meeting',
          'qbr-post',
          'mbr',
          'mbr-pre',
        ]);
      if (error) throw error;
      return (data || []) as RitualSessionRow[];
    },
    enabled: !!currentBuId && !!selectedCycleId,
    staleTime: 2 * 60 * 1000,
  });

  const teamsQuery = useTeams();
  const kpiHook = useKpiData({ scope: 'org' });
  const projectsQuery = useProjects({ status: 'in_progress' as any });

  const teamStats: TeamStat[] = useMemo(() => {
    const source = objectivesQuery.data || [];
    return source.map((objective) => {
      const krs = objective.key_results || [];
      const avgProgress = krs.length
        ? Math.round(
            krs.reduce(
              (sum, kr) =>
                sum +
                calculateProgress(
                  Number(kr.baseline) || 0,
                  Number(kr.current_value) || 0,
                  Number(kr.target) || 0,
                  (kr.direction || 'up') as 'up' | 'down',
                  { unit: (kr as { unit?: string | null }).unit },
                ),
              0,
            ) / krs.length,
          )
        : 0;

      const healthyCount = krs.filter((kr) => kr.status === 'green').length;
      const redYellowCount = krs.filter(
        (kr) => kr.status === 'red' || kr.status === 'yellow',
      ).length;
      const healthScore = krs.length ? Math.round((healthyCount / krs.length) * 100) : 0;
      const healthStatus: TeamStat['healthStatus'] =
        redYellowCount > healthyCount ? 'risk' : healthScore >= 70 ? 'healthy' : 'attention';

      return { objective, krs, avgProgress, healthScore, healthStatus };
    });
  }, [objectivesQuery.data]);

  const groupedAreaData: AreaGroup[] = useMemo(() => {
    const map = new Map<string, AreaGroup>();
    for (const stat of teamStats) {
      const areaName = stat.objective.team?.area?.name || 'Sem área';
      const areaKey = stat.objective.team?.area?.id || 'no-area';
      const teamId = stat.objective.team_id;
      const teamName = stat.objective.team?.name || 'Time';

      if (!map.has(areaKey)) {
        map.set(areaKey, {
          areaName,
          areaColor: stat.objective.team?.area?.color || null,
          teams: [],
          healthScoreAvg: 0,
        });
      }

      const area = map.get(areaKey)!;
      const existingTeam = area.teams.find((t) => t.teamId === teamId);
      if (!existingTeam) {
        area.teams.push({
          teamId,
          teamName,
          objectives: [stat],
          healthScore: stat.healthScore,
          avgProgress: stat.avgProgress,
          healthStatus: stat.healthStatus,
        });
      } else {
        existingTeam.objectives.push(stat);
        existingTeam.healthScore = Math.round(
          existingTeam.objectives.reduce((s, o) => s + o.healthScore, 0) /
            existingTeam.objectives.length,
        );
        existingTeam.avgProgress = Math.round(
          existingTeam.objectives.reduce((s, o) => s + o.avgProgress, 0) /
            existingTeam.objectives.length,
        );
      }
    }
    for (const area of map.values()) {
      area.healthScoreAvg = area.teams.length
        ? Math.round(area.teams.reduce((s, t) => s + t.healthScore, 0) / area.teams.length)
        : 0;
    }
    return [...map.values()].sort((a, b) => a.areaName.localeCompare(b.areaName));
  }, [teamStats]);

  const flatKrs = useMemo(() => teamStats.flatMap((x) => x.krs), [teamStats]);
  const cutoff = useMemo(() => subDays(new Date(), 7), []);
  const krsWithRecentCheckin = flatKrs.filter(
    (kr) => kr.last_checkin_at && isAfter(parseISO(kr.last_checkin_at), cutoff),
  ).length;
  const engagement = flatKrs.length
    ? Math.round((krsWithRecentCheckin / flatKrs.length) * 100)
    : 0;
  const okrsOnTrack = flatKrs.filter((kr) => kr.status === 'green').length;
  const okrsAtRisk = flatKrs.filter(
    (kr) => kr.status === 'yellow' || kr.status === 'red',
  ).length;
  const decisionsCount = (ritualsQuery.data || []).reduce(
    (sum, s) => sum + (Array.isArray(s.decisions) ? s.decisions.length : 0),
    0,
  );

  const kpisByCategory = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const kpi of kpiHook.kpis || []) {
      const key = ((kpi as any).category || 'sem categoria').toString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(kpi);
    }
    return [...groups.entries()].map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => {
        const score = (x: any) =>
          x.rag_status === 'red'
            ? 0
            : x.rag_status === 'yellow'
              ? 1
              : x.rag_status === 'green'
                ? 2
                : 3;
        return score(a) - score(b);
      }),
    }));
  }, [kpiHook.kpis]);

  const selectedCycle =
    cyclesQuery.data?.find((c) => c.id === selectedCycleId) ?? null;

  const projectsInCycle = useMemo(() => {
    if (!selectedCycle || !projectsQuery.data) return [];
    const start = parseISO(selectedCycle.start_date);
    const end = parseISO(selectedCycle.end_date);
    return projectsQuery.data.filter((project) => {
      const pStart = project.start_date ? parseISO(project.start_date) : null;
      const pDue = project.due_date ? parseISO(project.due_date) : null;
      if (!pStart && !pDue) return true;
      if (pStart && pDue) return !isAfter(pStart, end) && !isBefore(pDue, start);
      if (pStart) return !isAfter(pStart, end);
      return !isBefore(pDue!, start);
    });
  }, [projectsQuery.data, selectedCycle]);

  const riskProjects = useMemo(
    () =>
      [...projectsInCycle]
        .filter((p) => p.health === 'at_risk' || p.health === 'late')
        .sort((a, b) =>
          (a.due_date || '9999').localeCompare(b.due_date || '9999'),
        ),
    [projectsInCycle],
  );

  const ritualByTeam = useMemo(() => {
    const qbr = new Map<string, RitualSessionRow>();
    const mbr = new Map<string, RitualSessionRow>();
    for (const session of ritualsQuery.data || []) {
      if (!session.team_id) continue;
      if (session.wizard_type === 'qbr-pre') qbr.set(session.team_id, session);
      if (session.wizard_type === 'mbr-pre') mbr.set(session.team_id, session);
    }
    return { qbr, mbr };
  }, [ritualsQuery.data]);

  return {
    quarterCycles: cyclesQuery.data,
    selectedCycle,
    teams: teamsQuery.data,
    kpisByCategory,
    teamStats,
    groupedAreaData,
    okrsOnTrack,
    okrsAtRisk,
    engagement,
    decisionsCount,
    projectsInCycle,
    riskProjects,
    ritualByTeam,
    isLoading:
      cyclesQuery.isLoading ||
      objectivesQuery.isLoading ||
      ritualsQuery.isLoading ||
      kpiHook.isLoading ||
      projectsQuery.isLoading,
    errors: {
      cyclesError: cyclesQuery.error,
      objectivesError: objectivesQuery.error,
      ritualError: ritualsQuery.error,
      kpiError: kpiHook.error,
      projectsError: projectsQuery.error,
    },
  };
}
