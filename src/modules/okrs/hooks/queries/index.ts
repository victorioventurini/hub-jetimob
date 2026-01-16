/**
 * OKR Queries Module Index
 * 
 * Consolidated exports from the modular query structure.
 */

// Field definitions
export { OKR_FIELDS, OKR_JOINED_FIELDS, OKR_STALE_TIME } from './okrFieldDefinitions';

// Org objectives
export { useOrgObjectives, useOrgObjective, type UseOrgObjectivesOptions } from './useOrgObjectiveQueries';

// Org KRs
export { useOrgKeyResults, type UseOrgKeyResultsOptions } from './useOrgKeyResultQueries';

// Team objectives
export { useTeamObjectives, useMyTeamObjectives, type UseTeamObjectivesOptions } from './useTeamObjectiveQueries';

// Team KRs
export { useTeamKeyResults, useMyTeamKeyResults, type UseTeamKeyResultsOptions } from './useTeamKeyResultQueries';

// Check-ins
export { useKrCheckins, useLatestCheckinDate } from './useCheckinQueries';

// Helpers
export { useTeamsList as useTeams, useCyclesList as useCycles, useUserProfile } from '@/hooks/useSharedData';

// Aggregate types
export type { TeamKrLinked, OrgKrWithTeamKrs, OrgObjectiveWithKrs, OkrContributor, LinkedTeamObjective } from './aggregateTypes';

// Org view queries
export { useOrgObjectiveView, useAllOrgObjectivesView } from './useOrgObjectiveViewQueries';

// Team contributed queries
export { useTeamContributedOkrs, useSharedOkrsSummary, useSharedOkrsInsights } from './useTeamContributedQueries';

// Contributor queries
export { useObjectiveContributors, useTeamContributedObjectives, useTeamObjectivesWithSharedInfo, useManageContributors } from './useContributorQueries';

// Dashboard aggregate query
export {
  useOkrDashboardData,
  deriveStatusCounts,
  calculateOverallProgress,
  type OkrDashboardView,
  type OkrDashboardParams,
  type OkrDashboardData,
  type OkrTeam,
  type OrgObjectiveWithKrs as DashboardOrgObjectiveWithKrs,
  type TeamObjectiveWithKrs as DashboardTeamObjectiveWithKrs,
  type SharedOkrInsights,
} from './useOkrDashboardData';
