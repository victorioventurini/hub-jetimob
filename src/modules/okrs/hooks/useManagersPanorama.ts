/**
 * useManagersPanorama - Hook para buscar panorama de áreas para o Managers Checkin Wizard
 * 
 * Busca todos os times de nível raiz (áreas) e agrega métricas de OKRs para cada um.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { differenceInDays, parseISO } from 'date-fns';
import type { AreaOkrSummary, CrossDependency } from '@/modules/okrs/types/wizard';

// ============================================================
// PANORAMA HOOK
// ============================================================

export function useManagersPanorama(cycleId: string | null | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: ['managers-panorama', buId, cycleId],
    queryFn: async (): Promise<{
      areas: AreaOkrSummary[];
      companyProgress: number;
    }> => {
      if (!supabase || !buId || !cycleId) {
        return { areas: [], companyProgress: 0 };
      }

      // 1. Fetch all root-level teams (areas) - teams without parent
      const { data: rootTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('bu_id', buId)
        .is('parent_team_id', null)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');

      if (teamsError) throw teamsError;
      if (!rootTeams || rootTeams.length === 0) {
        return { areas: [], companyProgress: 0 };
      }

      // 2. Fetch all teams to build hierarchy
      const { data: allTeams, error: allTeamsError } = await supabase
        .from('teams')
        .select('id, name, parent_team_id')
        .eq('bu_id', buId)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (allTeamsError) throw allTeamsError;

      // Build a map of team -> root ancestor
      const teamToRootMap = new Map<string, string>();
      const buildTeamToRootMap = (teamId: string): string => {
        if (teamToRootMap.has(teamId)) return teamToRootMap.get(teamId)!;
        
        const team = allTeams?.find(t => t.id === teamId);
        if (!team || !team.parent_team_id) {
          teamToRootMap.set(teamId, teamId);
          return teamId;
        }
        
        const rootId = buildTeamToRootMap(team.parent_team_id);
        teamToRootMap.set(teamId, rootId);
        return rootId;
      };

      allTeams?.forEach(t => buildTeamToRootMap(t.id));

      // 3. Fetch all KRs in the cycle
      const { data: krsData, error: krsError } = await supabase
        .from('okr_team_key_results')
        .select(`
          id,
          current_value,
          target,
          baseline,
          status,
          direction,
          last_checkin_at,
          team_objective:okr_team_objectives!inner (
            id,
            cycle_id,
            team_id
          )
        `)
        .eq('team_objective.cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null);

      if (krsError) throw krsError;

      // 4. Aggregate data by root team
      const areaStats = new Map<string, {
        okrCount: number;
        progressSum: number;
        atRiskCount: number;
        recentCheckins: number;
        oldCheckins: number;
      }>();

      // Initialize stats for each root team
      rootTeams.forEach(team => {
        areaStats.set(team.id, {
          okrCount: 0,
          progressSum: 0,
          atRiskCount: 0,
          recentCheckins: 0,
          oldCheckins: 0,
        });
      });

      const now = new Date();
      const RECENT_THRESHOLD_DAYS = 7;

      for (const kr of krsData || []) {
        const teamObjective = kr.team_objective as any;
        if (!teamObjective?.team_id) continue;

        const rootTeamId = teamToRootMap.get(teamObjective.team_id);
        if (!rootTeamId || !areaStats.has(rootTeamId)) continue;

        const stats = areaStats.get(rootTeamId)!;
        stats.okrCount++;

        // Calculate progress
        const baseline = kr.baseline ?? 0;
        const current = kr.current_value ?? 0;
        const target = kr.target ?? 100;
        const direction = kr.direction ?? 'up';

        let progress: number;
        if (direction === 'up') {
          progress = target === baseline ? (current >= target ? 100 : 0) 
            : Math.max(0, Math.min(100, ((current - baseline) / (target - baseline)) * 100));
        } else {
          progress = baseline === target ? (current <= target ? 100 : 0)
            : Math.max(0, Math.min(100, ((baseline - current) / (baseline - target)) * 100));
        }
        stats.progressSum += progress;

        // Count at-risk
        if (kr.status === 'yellow' || kr.status === 'red') {
          stats.atRiskCount++;
        }

        // Count check-in recency
        if (kr.last_checkin_at) {
          const daysSince = differenceInDays(now, parseISO(kr.last_checkin_at));
          if (daysSince <= RECENT_THRESHOLD_DAYS) {
            stats.recentCheckins++;
          } else {
            stats.oldCheckins++;
          }
        } else {
          stats.oldCheckins++;
        }
      }

      // 5. Build final areas array
      const areas: AreaOkrSummary[] = rootTeams.map(team => {
        const stats = areaStats.get(team.id)!;
        const avgProgress = stats.okrCount > 0 ? Math.round(stats.progressSum / stats.okrCount) : 0;
        
        // Determine trend based on check-in activity
        let trend: 'improving' | 'stable' | 'declining';
        if (stats.okrCount === 0) {
          trend = 'stable';
        } else {
          const recentRatio = stats.recentCheckins / stats.okrCount;
          if (recentRatio >= 0.7) {
            trend = 'improving';
          } else if (recentRatio <= 0.3) {
            trend = 'declining';
          } else {
            trend = 'stable';
          }
        }

        return {
          areaName: team.name,
          teamId: team.id,
          okrCount: stats.okrCount,
          avgProgress,
          trend,
          atRiskCount: stats.atRiskCount,
        };
      }).filter(area => area.okrCount > 0); // Only include areas with OKRs

      // 6. Calculate company-wide progress
      let totalProgress = 0;
      let totalKrs = 0;
      areas.forEach(area => {
        totalProgress += area.avgProgress * area.okrCount;
        totalKrs += area.okrCount;
      });
      const companyProgress = totalKrs > 0 ? Math.round(totalProgress / totalKrs) : 0;

      return { areas, companyProgress };
    },
    enabled: isReady && !!buId && !!cycleId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================
// CROSS DEPENDENCIES HOOK
// ============================================================

export function useCrossDependencies(cycleId: string | null | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: ['cross-dependencies', buId, cycleId],
    queryFn: async (): Promise<CrossDependency[]> => {
      if (!supabase || !buId || !cycleId) {
        return [];
      }

      // Fetch dependencies from okr_dependencies table
      const { data: depsData, error: depsError } = await supabase
        .from('okr_dependencies')
        .select(`
          id,
          description,
          status,
          kr:okr_team_key_results!okr_dependencies_kr_id_fkey (
            id,
            title,
            status,
            team_objective:okr_team_objectives!inner (
              cycle_id,
              team:teams (id, name)
            )
          ),
          depends_on_kr:okr_team_key_results!okr_dependencies_depends_on_kr_id_fkey (
            id,
            title,
            team_objective:okr_team_objectives!inner (
              cycle_id,
              team:teams (id, name)
            )
          )
        `)
        .is('deleted_at', null);

      if (depsError) {
        console.error('Error fetching dependencies:', depsError);
        return [];
      }

      // Filter to only include dependencies where both KRs are in the current cycle
      // and transform to CrossDependency format
      const dependencies: CrossDependency[] = [];
      
      for (const dep of depsData || []) {
        const kr = dep.kr as any;
        const dependsOnKr = dep.depends_on_kr as any;
        
        if (!kr?.team_objective || !dependsOnKr?.team_objective) continue;
        if (kr.team_objective.cycle_id !== cycleId || dependsOnKr.team_objective.cycle_id !== cycleId) continue;
        
        const fromTeam = kr.team_objective.team;
        const toTeam = dependsOnKr.team_objective.team;
        
        if (!fromTeam || !toTeam) continue;
        
        // Skip if same team
        if (fromTeam.id === toTeam.id) continue;

        // Map status
        let status: 'healthy' | 'at_risk' | 'blocked' = 'healthy';
        if (dep.status === 'blocked') {
          status = 'blocked';
        } else if (dep.status === 'at_risk' || kr.status === 'red' || dependsOnKr.status === 'red') {
          status = 'at_risk';
        } else if (kr.status === 'yellow' || dependsOnKr.status === 'yellow') {
          status = 'at_risk';
        }

        dependencies.push({
          id: dep.id,
          description: dep.description || `${kr.title} depende de ${dependsOnKr.title}`,
          fromTeam: { id: fromTeam.id, name: fromTeam.name },
          toTeam: { id: toTeam.id, name: toTeam.name },
          status,
        });
      }

      // Sort: blocked first, then at_risk, then healthy
      return dependencies.sort((a, b) => {
        const statusOrder = { blocked: 0, at_risk: 1, healthy: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
    },
    enabled: isReady && !!buId && !!cycleId,
    staleTime: 2 * 60 * 1000,
  });
}
