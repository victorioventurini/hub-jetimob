/**
 * OKR Hooks - Barrel Export
 * 
 * Consolidated exports from all OKR hooks.
 * Organized by domain for easier discovery.
 */

// =========================
// CORE QUERIES (from queries/)
// =========================
export {
  // Field definitions
  OKR_FIELDS,
  // Org objectives
  useOrgObjectives,
  useOrgObjective,
  useOrgKeyResults,
  // Team objectives
  useTeamObjectives,
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
} from './queries';

// Aggregate/View queries
export {
  useOrgObjectiveView,
  useAllOrgObjectivesView,
  useTeamContributedOkrs,
  useSharedOkrsSummary,
  useSharedOkrsInsights,
  useObjectiveContributors,
  useTeamContributedObjectives,
  useTeamObjectivesWithSharedInfo,
  type TeamKrLinked,
  type OrgKrWithTeamKrs,
  type OrgObjectiveWithKrs,
  type OkrContributor,
  type LinkedTeamObjective,
} from './queries';

// Dashboard queries
export {
  useOkrDashboardData,
  deriveStatusCounts,
  calculateOverallProgress,
  type OkrDashboardView,
  type OkrDashboardParams,
  type OkrDashboardData,
  type OkrTeam,
  type SharedOkrInsights,
} from './queries';

// =========================
// CYCLE DATA
// =========================
export {
  useCycles as useCyclesList,
  useActiveCycles,
  useCycle,
  useCycleProgress,
  useDateCycleValidation,
  useExpectedProgress,
  type Cycle,
} from './useCycleData';

// =========================
// MUTATIONS
// =========================
export {
  useCancelOrgObjective,
  useCancelOrgKeyResult,
  useCancelTeamObjective,
  useCancelTeamKeyResult,
} from './useOkrMutations';

// =========================
// STATUS & HEALTH
// =========================
export {
  calculateAutoStatus,
  mapRagToCalculated,
  useKrStatusDistribution,
  STATUS_CONFIG,
  type OkrCalculatedStatus,
} from './useOkrStatus';

export {
  useObjectiveHealth,
  useRefreshObjectiveHealth,
  useObjectiveInsights,
  useGenerateObjectiveInsights,
  useDismissInsight,
  useRiskObjectives,
  useDashboardInsights,
} from './useOkrHealth';

// =========================
// CHECK-INS
// =========================
export { usePendingCheckins } from './usePendingCheckins';
export { useCycleCheckins } from './useCycleCheckins';
export { useCreateCheckin } from './useCreateCheckin';

// =========================
// INITIATIVES
// =========================
export {
  useKrInitiatives,
  useKrInitiativesCount,
  useUserInitiatives,
  useInitiativesByStatus,
  useCreateInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
  useUpdateInitiativeStatus,
} from './useInitiatives';
export { useInitiativeNameValidation } from './useInitiativeNameValidation';

// =========================
// CONTRIBUTIONS & METRICS
// =========================
export { useOkrContributions, useCreateOkrContribution, useDeleteOkrContribution } from './useOkrContributions';
export { useOkrKrMetrics } from './useOkrKrMetrics';
export { 
  useTeamContributionView,
  type TeamOkrContribution,
  type OrgKrContribution,
  type OrgObjectiveContribution,
  type TeamContributionData,
} from './useTeamContributionView';

// =========================
// TEAM-SPECIFIC
// =========================
export { useManageableTeams } from './useManageableTeams';
export { useCanManageTeamOkr, useCanManageOrgOkr } from './useCanManageTeamOkr';
export { useTeamOverviewMetrics } from './useTeamOverviewMetrics';
export { useTeamPendingKrs } from './useTeamPendingKrs';
export { useTeamPreviousCycleAnalysis } from './useTeamPreviousCycleAnalysis';

// =========================
// ORG VIEW - DEPRECATED: use useOrgObjectiveView from './queries' instead
// =========================
export { useOrgOkrsForContext } from './useOrgOkrsForContext';

// =========================
// WIZARD HOOKS
// =========================
export { useWizardDraft } from './useWizardDraft';
export { useKrWizardDraft } from './useKrWizardDraft';
export { useGenericWizardDraft } from './useGenericWizardDraft';
export { useWizardAI } from './useWizardAI';
export { useWizardOrchestrator } from './useWizardOrchestrator';
export { useWizardSession } from './useWizardSession';
export { useUserKrsForWizard } from './useUserKrsForWizard';

// =========================
// BUNDLE CREATION
// =========================
export { useCreateTeamOkrBundle } from './useCreateTeamOkrBundle';
export { useCreateTeamKrBundle } from './useCreateTeamKrBundle';

// =========================
// KPI & HISTORY
// =========================
export { useKpiHistory } from './useKpiHistory';
export { useKrHistory } from './useKrHistory';
