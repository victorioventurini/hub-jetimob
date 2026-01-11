/**
 * useOkrData - Re-export facade
 * 
 * This file provides a clean re-export interface from the consolidated queries module.
 * All implementations are in './queries' - this file just re-exports for convenience.
 * 
 * @see ./queries/useOkrQueries.ts for core queries
 * @see ./queries/useOkrAggregateQueries.ts for aggregate queries
 */

export {
  OKR_FIELDS,
  useOrgObjectives,
  useOrgObjective,
  useOrgKeyResults,
  useTeamObjectives,
  useTeamKeyResults,
  useMyTeamKeyResults,
  useKrCheckins,
  useLatestCheckinDate,
  useTeams,
  useCycles,
  useUserProfile,
} from './queries';
