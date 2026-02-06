/**
 * Org Objective View Queries
 * 
 * Complex queries for organizational objective views with aggregated data.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { OKR_FIELDS } from './okrFieldDefinitions';
import { 
  calculateProgress, 
  determineTrend, 
  calculateAggregatedStatus, 
  calculateAggregatedProgress,
  AGGREGATE_FIELDS,
} from './aggregateUtils';
import type { 
  OrgObjectiveWithKrs, 
  OrgKrWithTeamKrs, 
  TeamKrLinked,
  LinkedTeamObjective,
} from './aggregateTypes';

// ============================================================
// SINGLE OBJECTIVE VIEW
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
        .neq('status', 'cancelled')
        .neq('status', 'discarded')
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
      // Must exclude KRs from cancelled/deleted objectives
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
            team_objective:team_objective_id!inner (
              id, title, status, cancelled_at, deleted_at
            ),
            owner:owner_user_id (display_name)
          `)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null)
          .is('team_objective.cancelled_at', null)
          .is('team_objective.deleted_at', null)
          .not('team_objective.status', 'in', '(cancelled,discarded)');

        if (teamKrsError) {
          console.error('Error fetching team KRs:', teamKrsError);
        } else {
          teamKrsData = teamKrs || [];
        }
      }

      // Fetch team objectives linked to this org objective via org_objective_id
      const { data: teamObjectivesData, error: teamObjError } = await supabase
        .from('okr_team_objectives')
        .select(AGGREGATE_FIELDS.teamObjectiveWithKrsForView)
        .eq('org_objective_id', objectiveId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');

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

// ============================================================
// ALL OBJECTIVES VIEW
// ============================================================

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
        // Must exclude KRs from cancelled/deleted objectives
        const { data: teamKrs, error: teamKrsError } = await supabase
          .from('okr_team_key_results')
          .select(`
            id, title, team_id, team_objective_id, linked_org_kr_id, type,
            baseline, current_value, target, direction, unit, status,
            last_checkin_at, owner_user_id,
            teams:team_id (name),
            team_objective:team_objective_id!inner (
              id, title, status, cancelled_at, deleted_at
            ),
            owner:owner_user_id (display_name)
          `)
          .in('linked_org_kr_id', orgKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null)
          .is('team_objective.cancelled_at', null)
          .is('team_objective.deleted_at', null)
          .not('team_objective.status', 'in', '(cancelled,discarded)');

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
