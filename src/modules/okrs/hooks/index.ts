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
  useManageContributors,
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
export { usePendingCheckins, useTeamPendingCheckins, getDayName, type PendingCheckin } from './usePendingCheckins';
export { useCycleCheckins, formatDaysSince, type CycleCheckinsFilters, type CheckinFeedItem, type OverdueKr } from './useCycleCheckins';
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
export { useInitiativeNameValidation, type InitiativeNameFeedback, type InitiativeNameFeedbackType } from './useInitiativeNameValidation';

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
export { useManageableTeams, useManageableTeamsFlat } from './useManageableTeams';
export { useCanManageTeamOkr, useCanManageOrgOkr } from './useCanManageTeamOkr';
export { useTeamOverviewMetrics } from './useTeamOverviewMetrics';
export { useTeamPendingKrs } from './useTeamPendingKrs';
export { useTeamPreviousCycleAnalysis } from './useTeamPreviousCycleAnalysis';
export { useManagersPanorama, useCrossDependencies } from './useManagersPanorama';

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
export { useKpiHistory, useKrKpiHistory, useKpiChartData, type KpiHistoryData } from './useKpiHistory';
export { useKrHistory, useKrWithHistory, useKrChartData, type KrHistoryData, type KrCheckinHistory, type KrWithHistoryData } from './useKrHistory';

// =========================
// QUALITY & ANALYSIS
// =========================
export { useTeamOkrQuality, type QualityOverview, type ObjectiveWithHealth, type TeamOkrQualityData } from './useTeamOkrQuality';
export { 
  useOrgOkrAnalysis, 
  type OrgOkrAnalysisData,
  type AnalysisScore,
  type AnalysisGaps,
  type TeamSummary,
} from './useOrgOkrAnalysis';
export { useOrgHealthReview } from './useOrgHealthReview';
export { useConstructionReview } from './useConstructionReview';
