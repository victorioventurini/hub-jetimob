/**
 * OKR Field Definitions & Constants
 * 
 * Centralized field selections for all OKR queries.
 * Ensures explicit field selection (no select('*')).
 * 
 * @see TECHNICAL_CONTEXT_REGISTRY.md for standards
 */

// ============================================================
// FIELD DEFINITIONS (explicit, no select('*'))
// ============================================================

export const OKR_FIELDS = {
  orgObjective: `
    id, bu_id, title, description, year, status, 
    created_at, updated_at, deleted_at
  ` as const,
  
  orgObjectiveWithKrs: `
    id, bu_id, title, description, year, status, 
    created_at, updated_at, deleted_at,
    key_results:okr_org_key_results(
      id, bu_id, org_objective_id, title, baseline, current_value, target,
      direction, unit, status, owner_user_id, created_at, updated_at, deleted_at, cancelled_at,
      owner:profiles!okr_org_key_results_owner_profile_fkey(id, display_name, photo_url)
    )
  ` as const,
  
  orgKr: `
    id, bu_id, org_objective_id, title, baseline, current_value, target,
    direction, unit, status, owner_user_id, created_at, updated_at, deleted_at, cancelled_at,
    owner:profiles!okr_org_key_results_owner_profile_fkey(id, display_name, photo_url)
  ` as const,
  
  teamObjective: `
    id, bu_id, team_id, title, description, year, status, org_objective_id,
    is_shared, responsibility_model, created_at, updated_at, deleted_at
  ` as const,
  
  teamObjectiveWithKrs: `
    id, bu_id, team_id, title, description, year, status, org_objective_id,
    is_shared, responsibility_model, created_at, updated_at, deleted_at,
    team:teams!okr_team_objectives_team_id_fkey(id, name),
    key_results:okr_team_key_results(
      id, bu_id, team_id, team_objective_id, linked_org_kr_id, parent_kr_id,
      title, type, baseline, current_value, target, direction, unit, status,
      owner_user_id, last_checkin_at, created_at, updated_at, deleted_at, cancelled_at,
      owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name, photo_url)
    )
  ` as const,
  
  teamKr: `
    id, bu_id, team_id, team_objective_id, linked_org_kr_id, parent_kr_id, metric_id,
    title, type, baseline, current_value, target, direction, unit, status,
    owner_user_id, co_responsibles, last_checkin_at, evidence_url,
    created_at, updated_at, deleted_at, cancelled_at
  ` as const,
  
  checkin: `
    id, kr_id, kr_type, user_id, date, previous_value, current_value,
    confidence, comments, blockers, created_at
  ` as const,
} as const;

// Joined fields for complex queries
export const OKR_JOINED_FIELDS = {
  teamObjectiveWithTeam: `
    ${OKR_FIELDS.teamObjective},
    team:teams!okr_team_objectives_team_id_fkey(id, name)
  ` as const,
  
  teamKrWithRelations: `
    ${OKR_FIELDS.teamKr},
    team:teams!okr_team_key_results_team_id_fkey(id, name),
    team_objective:okr_team_objectives!okr_team_key_results_team_objective_id_fkey(id, title),
    owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name, photo_url)
  ` as const,
} as const;

// ============================================================
// STALE TIME CONSTANTS
// ============================================================

export const OKR_STALE_TIME = {
  list: 2 * 60 * 1000,      // 2 minutes for lists
  detail: 5 * 60 * 1000,    // 5 minutes for single items
  checkin: 1 * 60 * 1000,   // 1 minute for frequently updated
} as const;
