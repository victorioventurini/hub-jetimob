/**
 * OKR Queries Module Index
 * 
 * Consolidated exports from the new query structure.
 * This replaces imports from fragmented files:
 * - useOkrData.ts
 * - useSharedOkrData.ts
 * - useTeamContributedOkrs.ts
 * - useOrgObjectiveView.ts
 * - useTeamContributionView.ts
 */

// Core queries
export {
  // Field definitions
  OKR_FIELDS,
  OKR_JOINED_FIELDS,
  // Org objectives
  useOrgObjectives,
  useOrgObjective,
  // Org KRs
  useOrgKeyResults,
  // Team objectives  
  useTeamObjectives,
  // Team KRs
  useTeamKeyResults,
  useMyTeamKeyResults,
  useMyTeamObjectives,
  // Check-ins
  useKrCheckins,
  useLatestCheckinDate,
  // Helpers
  useTeams,
  useCycles,
  useUserProfile,
  // Types
  type UseOrgObjectivesOptions,
  type UseOrgKeyResultsOptions,
  type UseTeamObjectivesOptions,
  type UseTeamKeyResultsOptions,
} from './useOkrQueries';

// Aggregate/View queries
export {
  // Org view
  useOrgObjectiveView,
  useAllOrgObjectivesView,
  // Team contributed
  useTeamContributedOkrs,
  useSharedOkrsSummary,
  useSharedOkrsInsights,
  // Contributors
  useObjectiveContributors,
  useTeamContributedObjectives,
  useTeamObjectivesWithSharedInfo,
  // Types
  type TeamKrLinked,
  type OrgKrWithTeamKrs,
  type OrgObjectiveWithKrs,
  type OkrContributor,
} from './useOkrAggregateQueries';

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
