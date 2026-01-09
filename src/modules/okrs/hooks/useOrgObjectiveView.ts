import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import type { OkrRagStatus, OkrDirection, OkrKrType } from '../types';

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

export interface OrgObjectiveWithKrs {
  id: string;
  title: string;
  description: string | null;
  year: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'discarded';
  aggregatedStatus: 'on_track' | 'at_risk' | 'off_track';
  aggregatedProgress: number;
  orgKrs: OrgKrWithTeamKrs[];
}

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

function determineTrend(status: OkrRagStatus, progress: number): 'up' | 'stable' | 'down' {
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

export function useOrgObjectiveView(objectiveId: string) {
  const { currentBu } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ['org-objective-view', objectiveId, currentBu?.id],
    queryFn: async (): Promise<OrgObjectiveWithKrs | null> => {
      if (!supabase) return null;
      
      // Fetch org objective
      const { data: objective, error: objError } = await supabase
        .from('okr_org_objectives')
        .select('id, title, description, year, status, bu_id')
        .eq('id', objectiveId)
        .is('deleted_at', null)
        .single();

      if (objError || !objective) {
        console.error('Error fetching objective:', objError);
        return null;
      }

      // Fetch org KRs
      const { data: orgKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select('id, org_objective_id, title, baseline, current_value, target, direction, unit, status')
        .eq('org_objective_id', objectiveId)
        .is('deleted_at', null)
        .order('created_at');

      if (krsError) {
        console.error('Error fetching org KRs:', krsError);
        return null;
      }

      // Fetch team KRs linked to org KRs
      const orgKrIds = orgKrs?.map(kr => kr.id) || [];
      
      let teamKrsData: any[] = [];
      if (orgKrIds.length > 0) {
        const { data: teamKrs, error: teamKrsError } = await supabase
          .from('okr_team_key_results')
          .select(`
            id, title, team_id, team_objective_id, linked_org_kr_id, type,
            baseline, current_value, target, direction, unit, status,
            last_checkin_at, owner_user_id,
            teams:team_id (name),
            team_objective:team_objective_id (title),
            owner:owner_user_id (display_name)
          `)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null);

        if (teamKrsError) {
          console.error('Error fetching team KRs:', teamKrsError);
        } else {
          teamKrsData = teamKrs || [];
        }
      }

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
      };
    },
    enabled: !!objectiveId && isReady && !!supabase,
  });
}

export function useAllOrgObjectivesView(year?: number) {
  const { currentBu } = useBu();
  const currentYear = year || new Date().getFullYear();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ['all-org-objectives-view', currentYear, currentBu?.id],
    queryFn: async (): Promise<OrgObjectiveWithKrs[]> => {
      if (!supabase) return [];
      
      // Fetch all org objectives for the year
      let query = supabase
        .from('okr_org_objectives')
        .select('id, title, description, year, status, bu_id')
        .eq('year', currentYear)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at');

      if (currentBu?.id) {
        query = query.eq('bu_id', currentBu.id);
      }

      const { data: objectives, error: objError } = await query;

      if (objError || !objectives) {
        console.error('Error fetching objectives:', objError);
        return [];
      }

      // Fetch all org KRs
      const objectiveIds = objectives.map(o => o.id);
      if (objectiveIds.length === 0) return [];

      const { data: allOrgKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select('id, org_objective_id, title, baseline, current_value, target, direction, unit, status')
        .in('org_objective_id', objectiveIds)
        .is('deleted_at', null);

      if (krsError) {
        console.error('Error fetching org KRs:', krsError);
        return [];
      }

      // Fetch all team KRs linked to org KRs
      const orgKrIds = allOrgKrs?.map(kr => kr.id) || [];
      
      let teamKrsData: any[] = [];
      if (orgKrIds.length > 0) {
        const { data: teamKrs, error: teamKrsError } = await supabase
          .from('okr_team_key_results')
          .select(`
            id, title, team_id, team_objective_id, linked_org_kr_id, type,
            baseline, current_value, target, direction, unit, status,
            last_checkin_at, owner_user_id,
            teams:team_id (name),
            team_objective:team_objective_id (title),
            owner:owner_user_id (display_name)
          `)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null);

        if (!teamKrsError) {
          teamKrsData = teamKrs || [];
        }
      }

      // Build response for each objective
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
        };
      });
    },
    enabled: isReady && !!supabase,
  });
}
