/**
 * useOkrData - DEPRECATED
 * 
 * This file is now a re-export facade for backward compatibility.
 * New code should import from '@/modules/okrs/hooks/queries' directly.
 * 
 * @deprecated Use imports from './queries' instead
 * @see ./queries/useOkrQueries.ts for core queries
 * @see ./queries/useOkrAggregateQueries.ts for aggregate queries
 */

// Re-export everything from the new consolidated modules
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

// Legacy function signatures for backward compatibility
// These match the old API but delegate to the new implementation
import { useOrgObjectives as _useOrgObjectives } from './queries';
import { useOrgKeyResults as _useOrgKeyResults } from './queries';

/**
 * @deprecated Use useOrgObjectives({ buId, year }) instead
 */
export function useOrgObjectivesWithKrs(buId?: string | null, year?: number, includeAllStatuses: boolean = false) {
  return _useOrgObjectives({ buId, year, includeAllStatuses });
}

/**
 * @deprecated Use useOrgKeyResults({ buId }) instead
 */
export function useAllOrgKeyResults(buId?: string | null, includeCancelled: boolean = false) {
  return _useOrgKeyResults({ buId, includeCancelled });
}

/**
 * @deprecated Use useTeamObjectives({ buId, teamId }) instead
 */
export function useTeamObjectivesWithKrs(buId?: string | null, teamId?: string, includeAllStatuses: boolean = false) {
  const { useTeamObjectives } = require('./queries');
  return useTeamObjectives({ buId, teamId, includeAllStatuses });
}
