/**
 * useOkrAggregateQueries - Consolidated OKR Aggregate/View Queries
 * 
 * Complex queries that fetch related data and build aggregated views.
 * Moved from multiple fragmented files:
 * - useOrgObjectiveView.ts
 * - useTeamContributionView.ts
 * - useSharedOkrData.ts
 * - useTeamContributedOkrs.ts
 * 
 * @see TECHNICAL_CONTEXT_REGISTRY.md for standards
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS } from './useOkrQueries';
import type { OkrRagStatus, OkrDirection, OkrKrType } from '../../types';

// ============================================================
// TYPES
// ============================================================

export interface TeamKrLinked {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  team_objective_id: string | null;
  team_objective_title: string | null;
  type: OkrKrType;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  last_checkin_at: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  progress: number;
}

export interface OrgKrWithTeamKrs {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  progress: number;
  trend: 'up' | 'stable' | 'down';
  linkedTeamKrs: TeamKrLinked[];
}

export interface LinkedTeamObjective {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  krs: TeamKrLinked[];
}

export interface OrgObjectiveWithKrs {
  id: string;
  title: string;
  description: string | null;
  year: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'discarded';
  aggregatedStatus: 'on_track' | 'at_risk' | 'off_track';
  aggregatedProgress: number;
  orgKrs: OrgKrWithTeamKrs[];
  linkedTeamObjectives: LinkedTeamObjective[];
}

export interface OkrContributor {
  id: string;
  objective_id: string;
  team_id: string;
  created_at: string;
  team?: {
    id: string;
    name: string;
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function calculateProgress(baseline: number, current: number, target: number, direction: OkrDirection): number {
  if (direction === 'up') {
    if (target === baseline) return current >= target ? 100 : 0;
    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, progress));
  } else {
    if (baseline === target) return current <= target ? 100 : 0;
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, Math.min(100, progress));
  }
}

function determineTrend(status: OkrRagStatus, _progress: number): 'up' | 'stable' | 'down' {
  if (status === 'green') return 'up';
  if (status === 'red') return 'down';
  return 'stable';
}

function calculateAggregatedStatus(orgKrs: OrgKrWithTeamKrs[]): 'on_track' | 'at_risk' | 'off_track' {
  if (orgKrs.length === 0) return 'off_track';
  
  const redCount = orgKrs.filter(kr => kr.status === 'red').length;
  const yellowCount = orgKrs.filter(kr => kr.status === 'yellow').length;
  const greenCount = orgKrs.filter(kr => kr.status === 'green').length;
  
  if (redCount > orgKrs.length / 2) return 'off_track';
  if (redCount > 0 || yellowCount > orgKrs.length / 3) return 'at_risk';
  if (greenCount >= orgKrs.length / 2) return 'on_track';
  return 'at_risk';
}

function calculateAggregatedProgress(orgKrs: OrgKrWithTeamKrs[]): number {
  if (orgKrs.length === 0) return 0;
  const total = orgKrs.reduce((sum, kr) => sum + kr.progress, 0);
  return Math.round(total / orgKrs.length);
}

// ============================================================
// FIELD DEFINITIONS
// ============================================================

const TEAM_KR_WITH_RELATIONS_FIELDS = `
  id, title, team_id, team_objective_id, linked_org_kr_id, type,
  baseline, current_value, target, direction, unit, status,
  last_checkin_at, owner_user_id,
  teams:team_id (name),
  team_objective:team_objective_id (title),
  owner:owner_user_id (display_name)
` as const;

const CONTRIBUTED_VIEW_FIELDS = `
  objective_id, objective_title, objective_status, 
  primary_team_id, primary_team_name,
  contributor_team_id, contributor_team_name, 
  is_shared, responsibility_model
` as const;

const TEAM_OBJECTIVE_WITH_KRS_FIELDS = `
  id, title, description, status, team_id, created_at, updated_at,
  team:teams!okr_team_objectives_team_id_fkey(id, name),
  key_results:okr_team_key_results(
    id, title, baseline, current_value, target, direction, unit, status, last_checkin_at
  )
` as const;

const SHARED_SUMMARY_FIELDS = `
  objective_id, title, primary_team_id, primary_team_name,
  contributor_count, is_shared, responsibility_model, status
` as const;

const TEAM_OBJECTIVE_WITH_KRS_FOR_VIEW = `
  id, title, status, team_id, org_objective_id,
  teams:team_id (id, name),
  key_results:okr_team_key_results (
    id, title, baseline, current_value, target, direction, unit, status, 
    last_checkin_at, owner_user_id, team_objective_id, team_id, type, linked_org_kr_id
  )
` as const;

// ============================================================
// ORG OBJECTIVE VIEW
// ============================================================

export function useOrgObjectiveView(objectiveId: string) {
  const { currentBu } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.orgObjectiveView(objectiveId, currentBu?.id ?? null),
    queryFn: async (): Promise<OrgObjectiveWithKrs | null> => {
      if (!supabase) return null;
      
      // Fetch org objective (exclude cancelled)
      const { data: objective, error: objError } = await supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjective)
        .eq('id', objectiveId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .maybeSingle();

      if (objError || !objective) {
        console.error('Error fetching objective:', objError);
        return null;
      }

      // Fetch org KRs (exclude cancelled)
      const { data: orgKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select(OKR_FIELDS.orgKr)
        .eq('org_objective_id', objectiveId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at');

      if (krsError) {
        console.error('Error fetching org KRs:', krsError);
        return null;
      }

      // Fetch team KRs linked to org KRs via linked_org_kr_id
      const orgKrIds = orgKrs?.map(kr => kr.id) || [];
      
      let teamKrsData: any[] = [];
      if (orgKrIds.length > 0) {
        const { data: teamKrs, error: teamKrsError } = await supabase
          .from('okr_team_key_results')
          .select(TEAM_KR_WITH_RELATIONS_FIELDS)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (teamKrsError) {
          console.error('Error fetching team KRs:', teamKrsError);
        } else {
          teamKrsData = teamKrs || [];
        }
      }

      // Fetch team objectives linked to this org objective via org_objective_id
      const { data: teamObjectivesData, error: teamObjError } = await supabase
        .from('okr_team_objectives')
        .select(TEAM_OBJECTIVE_WITH_KRS_FOR_VIEW)
        .eq('org_objective_id', objectiveId)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (teamObjError) {
        console.error('Error fetching team objectives:', teamObjError);
      }

      // Build linked team objectives with their KRs
      const linkedTeamObjectives: LinkedTeamObjective[] = (teamObjectivesData || []).map((tobj: any) => ({
        id: tobj.id,
        title: tobj.title,
        team_id: tobj.team_id,
        team_name: tobj.teams?.name || 'Time não encontrado',
        status: tobj.status,
        krs: (tobj.key_results || [])
          .filter((kr: any) => !kr.deleted_at && !kr.cancelled_at)
          .map((kr: any) => ({
            id: kr.id,
            title: kr.title,
            team_id: kr.team_id,
            team_name: tobj.teams?.name || 'Time não encontrado',
            team_objective_id: kr.team_objective_id,
            team_objective_title: tobj.title,
            type: kr.type,
            baseline: kr.baseline,
            current_value: kr.current_value,
            target: kr.target,
            direction: kr.direction,
            unit: kr.unit,
            status: kr.status,
            last_checkin_at: kr.last_checkin_at,
            owner_user_id: kr.owner_user_id,
            owner_name: null,
            progress: calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction),
          })),
      }));

      // Build the response
      const orgKrsWithTeamKrs: OrgKrWithTeamKrs[] = (orgKrs || []).map(orgKr => {
        const progress = calculateProgress(orgKr.baseline, orgKr.current_value, orgKr.target, orgKr.direction);
        const linkedTeamKrs: TeamKrLinked[] = teamKrsData
          .filter(tkr => tkr.linked_org_kr_id === orgKr.id)
          .map(tkr => ({
            id: tkr.id,
            title: tkr.title,
            team_id: tkr.team_id,
            team_name: tkr.teams?.name || 'Time não encontrado',
            team_objective_id: tkr.team_objective_id,
            team_objective_title: tkr.team_objective?.title || null,
            type: tkr.type,
            baseline: tkr.baseline,
            current_value: tkr.current_value,
            target: tkr.target,
            direction: tkr.direction,
            unit: tkr.unit,
            status: tkr.status,
            last_checkin_at: tkr.last_checkin_at,
            owner_user_id: tkr.owner_user_id,
            owner_name: tkr.owner?.display_name || null,
            progress: calculateProgress(tkr.baseline, tkr.current_value, tkr.target, tkr.direction),
          }));

        return {
          id: orgKr.id,
          title: orgKr.title,
          baseline: orgKr.baseline,
          current_value: orgKr.current_value,
          target: orgKr.target,
          direction: orgKr.direction,
          unit: orgKr.unit,
          status: orgKr.status,
          progress,
          trend: determineTrend(orgKr.status, progress),
          linkedTeamKrs,
        };
      });

      return {
        id: objective.id,
        title: objective.title,
        description: objective.description,
        year: objective.year,
        status: objective.status,
        aggregatedStatus: calculateAggregatedStatus(orgKrsWithTeamKrs),
        aggregatedProgress: calculateAggregatedProgress(orgKrsWithTeamKrs),
        orgKrs: orgKrsWithTeamKrs,
        linkedTeamObjectives,
      };
    },
    enabled: !!objectiveId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllOrgObjectivesView(year?: number) {
  const currentYear = year || new Date().getFullYear();
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.allOrgObjectivesView(currentYear, buId ?? null),
    queryFn: async (): Promise<OrgObjectiveWithKrs[]> => {
      if (!supabase || !buId) return [];
      
      const query = supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjective)
        .eq('bu_id', buId)
        .eq('year', currentYear)
        .neq('status', 'cancelled')
        .neq('status', 'discarded')
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at');

      const { data: objectives, error: objError } = await query;

      if (objError || !objectives) {
        console.error('Error fetching objectives:', objError);
        return [];
      }

      const objectiveIds = objectives.map(o => o.id);
      if (objectiveIds.length === 0) return [];

      const { data: allOrgKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select(OKR_FIELDS.orgKr)
        .in('org_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (krsError) {
        console.error('Error fetching org KRs:', krsError);
        return [];
      }

      const orgKrIds = allOrgKrs?.map(kr => kr.id) || [];
      
      let teamKrsData: any[] = [];
      if (orgKrIds.length > 0) {
        const { data: teamKrs, error: teamKrsError } = await supabase
          .from('okr_team_key_results')
          .select(TEAM_KR_WITH_RELATIONS_FIELDS)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (!teamKrsError) {
          teamKrsData = teamKrs || [];
        }
      }

      return objectives.map(objective => {
        const objectiveOrgKrs = allOrgKrs?.filter(kr => kr.org_objective_id === objective.id) || [];
        
        const orgKrsWithTeamKrs: OrgKrWithTeamKrs[] = objectiveOrgKrs.map(orgKr => {
          const progress = calculateProgress(orgKr.baseline, orgKr.current_value, orgKr.target, orgKr.direction);
          const linkedTeamKrs: TeamKrLinked[] = teamKrsData
            .filter(tkr => tkr.linked_org_kr_id === orgKr.id)
            .map(tkr => ({
              id: tkr.id,
              title: tkr.title,
              team_id: tkr.team_id,
              team_name: tkr.teams?.name || 'Time não encontrado',
              team_objective_id: tkr.team_objective_id,
              team_objective_title: tkr.team_objective?.title || null,
              type: tkr.type,
              baseline: tkr.baseline,
              current_value: tkr.current_value,
              target: tkr.target,
              direction: tkr.direction,
              unit: tkr.unit,
              status: tkr.status,
              last_checkin_at: tkr.last_checkin_at,
              owner_user_id: tkr.owner_user_id,
              owner_name: tkr.owner?.display_name || null,
              progress: calculateProgress(tkr.baseline, tkr.current_value, tkr.target, tkr.direction),
            }));

          return {
            id: orgKr.id,
            title: orgKr.title,
            baseline: orgKr.baseline,
            current_value: orgKr.current_value,
            target: orgKr.target,
            direction: orgKr.direction,
            unit: orgKr.unit,
            status: orgKr.status,
            progress,
            trend: determineTrend(orgKr.status, progress),
            linkedTeamKrs,
          };
        });

        return {
          id: objective.id,
          title: objective.title,
          description: objective.description,
          year: objective.year,
          status: objective.status,
          aggregatedStatus: calculateAggregatedStatus(orgKrsWithTeamKrs),
          aggregatedProgress: calculateAggregatedProgress(orgKrsWithTeamKrs),
          orgKrs: orgKrsWithTeamKrs,
          linkedTeamObjectives: [], // TODO: Fetch team objectives for bulk view if needed
        };
      });
    },
    enabled: isReady && !!supabase && !!buId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================
// TEAM CONTRIBUTED OKRS
// ============================================================

export function useTeamContributedOkrs(teamId?: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamContributedOkrs(teamId ?? null),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      const { data: contributions, error: contribError } = await supabase
        .from('v_team_contributed_okrs')
        .select(CONTRIBUTED_VIEW_FIELDS)
        .eq('contributor_team_id', teamId);

      if (contribError) {
        console.error('Error fetching contributed OKRs:', contribError);
        throw contribError;
      }

      if (!contributions || contributions.length === 0) return [];

      const objectiveIds = [...new Set(contributions.map(c => c.objective_id))];

      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select(TEAM_OBJECTIVE_WITH_KRS_FIELDS)
        .in('id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (objError) {
        console.error('Error fetching objective details:', objError);
        throw objError;
      }

      return objectives || [];
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSharedOkrsSummary() {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.sharedSummary(),
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('v_shared_okrs_summary')
        .select(SHARED_SUMMARY_FIELDS);

      if (error) {
        console.error('Error fetching shared OKRs summary:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isReady && !!supabase,
    staleTime: 3 * 60 * 1000,
  });
}

export function useSharedOkrsInsights() {
  const { data: sharedOkrs } = useSharedOkrsSummary();

  const insights = {
    sharedOkrsCount: sharedOkrs?.length || 0,
    teamsWithMostDependencies: [] as Array<{ name: string; count: number }>,
    overdueSharedOkrsCount: 0,
  };

  if (sharedOkrs && sharedOkrs.length > 0) {
    const teamCounts = new Map<string, number>();
    
    sharedOkrs.forEach((okr: any) => {
      if (okr.primary_team_name) {
        teamCounts.set(
          okr.primary_team_name, 
          (teamCounts.get(okr.primary_team_name) || 0) + 1
        );
      }
      if (okr.contributing_team_names) {
        okr.contributing_team_names.forEach((teamName: string) => {
          teamCounts.set(teamName, (teamCounts.get(teamName) || 0) + 1);
        });
      }
    });

    insights.teamsWithMostDependencies = Array.from(teamCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  return insights;
}

// ============================================================
// OBJECTIVE CONTRIBUTORS
// ============================================================

export function useObjectiveContributors(objectiveId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.objectiveContributors(objectiveId ?? null),
    queryFn: async (): Promise<OkrContributor[]> => {
      if (!objectiveId || !supabase) return [];

      const { data, error } = await supabase
        .from('okr_team_objective_contributors')
        .select(`
          id,
          objective_id,
          team_id,
          created_at,
          team:teams(id, name)
        `)
        .eq('objective_id', objectiveId);

      if (error) throw error;
      return data as unknown as OkrContributor[];
    },
    enabled: !!objectiveId && isReady && !!supabase,
  });
}

export function useTeamContributedObjectives(teamId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamContributedObjectives(teamId ?? null),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      const { data: contributions, error: contribError } = await supabase
        .from('okr_team_objective_contributors')
        .select('objective_id')
        .eq('team_id', teamId);

      if (contribError) throw contribError;
      if (!contributions || contributions.length === 0) return [];

      const objectiveIds = contributions.map(c => c.objective_id);

      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select(`
          id, bu_id, team_id, title, description, year, status, org_objective_id,
          is_shared, responsibility_model, created_at, updated_at, deleted_at, cancelled_at,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .in('id', objectiveIds)
        .neq('team_id', teamId)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (objError) throw objError;
      return objectives;
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeamObjectivesWithSharedInfo(buId?: string | null, teamId?: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.teamObjectivesWithShared(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(`
          id, bu_id, team_id, title, description, year, status, org_objective_id,
          is_shared, responsibility_model, created_at, updated_at, deleted_at, cancelled_at,
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: objectives, error } = await query;
      if (error) throw error;

      const sharedObjectiveIds = objectives
        ?.filter(obj => obj.is_shared)
        .map(obj => obj.id) || [];

      let contributorsMap = new Map<string, OkrContributor[]>();

      if (sharedObjectiveIds.length > 0) {
        const { data: contributors, error: contribError } = await supabase
          .from('okr_team_objective_contributors')
          .select(`
            id,
            objective_id,
            team_id,
            created_at,
            team:teams(id, name)
          `)
          .in('objective_id', sharedObjectiveIds);

        if (contribError) throw contribError;

        contributors?.forEach(contrib => {
          const existing = contributorsMap.get(contrib.objective_id) || [];
          existing.push(contrib as unknown as OkrContributor);
          contributorsMap.set(contrib.objective_id, existing);
        });
      }

      return objectives?.map(obj => ({
        ...obj,
        contributors: contributorsMap.get(obj.id) || [],
      }));
    },
    enabled: !!buId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}
