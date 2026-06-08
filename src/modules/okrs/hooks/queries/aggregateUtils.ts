/**
 * OKR Aggregate Utility Functions
 * 
 * Shared utility functions for aggregate OKR queries.
 */

import type { OkrDirection, OkrRagStatus } from '../../types';
import type { OrgKrWithTeamKrs } from './aggregateTypes';
import { getEffectiveKrRagStatus } from '../../utils/effectiveStatus';
import { calculateProgress as calculateCanonicalProgress } from '../../utils/progressCalculation';

export function calculateProgress(
  baseline: number,
  current: number,
  target: number,
  direction: OkrDirection,
  unit?: string | null,
): number {
  return calculateCanonicalProgress(baseline, current, target, direction, { unit });
}

export function determineTrend(status: OkrRagStatus, _progress: number): 'up' | 'stable' | 'down' {
  if (status === 'green') return 'up';
  if (status === 'red') return 'down';
  return 'stable';
}

export function calculateAggregatedStatus(orgKrs: OrgKrWithTeamKrs[]): 'on_track' | 'at_risk' | 'off_track' {
  if (orgKrs.length === 0) return 'off_track';
  
  const effectiveStatuses = orgKrs.map(kr => getEffectiveKrRagStatus(kr.status, kr.baseline, kr.current_value));
  const redCount = effectiveStatuses.filter(s => s === 'red').length;
  const yellowCount = effectiveStatuses.filter(s => s === 'yellow').length;
  const greenCount = effectiveStatuses.filter(s => s === 'green').length;
  
  if (redCount > orgKrs.length / 2) return 'off_track';
  if (redCount > 0 || yellowCount > orgKrs.length / 3) return 'at_risk';
  if (greenCount >= orgKrs.length / 2) return 'on_track';
  return 'at_risk';
}

export function calculateAggregatedProgress(orgKrs: OrgKrWithTeamKrs[]): number {
  if (orgKrs.length === 0) return 0;
  // Progresso agregado do Objetivo: cap per-KR a 100% antes da média.
  // Canon no-clamp vale para exibição por KR (superação visível); para o agregado,
  // um KR muito acima de 100% (ex.: unidade inconsistente) distorceria o todo.
  const total = orgKrs.reduce((sum, kr) => sum + Math.min(100, Math.max(0, kr.progress)), 0);
  return Math.round(total / orgKrs.length);
}

// Field definitions for aggregate queries
export const AGGREGATE_FIELDS = {
  teamKrWithRelations: `
    id, title, team_id, team_objective_id, linked_org_kr_id, type,
    baseline, current_value, target, direction, unit, status,
    last_checkin_at, owner_user_id,
    teams:team_id (name),
    team_objective:team_objective_id (title),
    owner:owner_user_id (display_name)
  ` as const,

  contributedView: `
    objective_id, objective_title, objective_status, 
    primary_team_id, primary_team_name,
    contributor_team_id, contributor_team_name, 
    is_shared, responsibility_model
  ` as const,

  teamObjectiveWithKrs: `
    id, title, description, status, team_id, is_shared, responsibility_model, org_objective_id, created_at, updated_at,
    team:teams!okr_team_objectives_team_id_fkey(id, name),
    key_results:okr_team_key_results(
      id, title, baseline, current_value, target, direction, unit, status, last_checkin_at, team_id, owner_user_id
    )
  ` as const,

  sharedSummary: `
    objective_id, bu_id, title, primary_team_id, primary_team_name,
    contributor_count, is_shared, responsibility_model, status
  ` as const,

  teamObjectiveWithKrsForView: `
    id, title, status, team_id, org_objective_id,
    teams:team_id (id, name),
    key_results:okr_team_key_results (
      id, title, baseline, current_value, target, direction, unit, status, 
      last_checkin_at, owner_user_id, team_objective_id, team_id, type, linked_org_kr_id
    )
  ` as const,
} as const;
