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

// Draft objectives (QBR-pre hydration)
export {
  useDraftObjectivesForCycle,
  type DraftObjective,
  type DraftObjectiveKr,
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

// Active cycle (status-based)
export { useActiveCycle, type CycleWithStatus } from './useActiveCycle';
export { useCycleActions } from './useCycleActions';
export {
  useTeamOkrCreationWindow,
  type TeamOkrCreationWindow,
} from './useTeamOkrCreationWindow';

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
export { 
  useOkrKrMetrics, 
  usePrimaryKrMetric, 
  useGuardrailKrMetrics, 
  useCreateKrMetric, 
  useUpdateKrMetric, 
  useDeleteKrMetric 
} from './useOkrKrMetrics';
export {
  usePrimaryKpiForKr,
  isKrValueLocked,
  calculateKrProgressFromKpi,
  type PrimaryKpiData,
  type UsePrimaryKpiForKrResult,
} from './usePrimaryKpiForKr';
export {
  useKrPrimaryKpiBatch,
  type KrPrimaryKpiInfo,
  type UseKrPrimaryKpiBatchResult,
} from './useKrPrimaryKpiBatch';
export {
  useKrEffectiveValues,
  getEffectiveTarget,
  type KrEffectiveValues,
  type UseKrEffectiveValuesResult,
} from './useKrEffectiveValues';
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
export { useCanEditKr } from './useCanEditKr';
export { useCanEditInitiative } from './useCanEditInitiative';
export { useCanEditTeamObjective } from './useCanEditTeamObjective';
export { useTeamOverviewMetrics } from './useTeamOverviewMetrics';
export { useTeamPendingKrs } from './useTeamPendingKrs';
export {
  useTeamCollaboratorAgendaSuggestions,
  type AggregatedAgendaSuggestion,
} from './useTeamCollaboratorAgendaSuggestions';
export { useSelectedTeamCheckinAgenda } from './useSelectedTeamCheckinAgenda';
export {
  useTeamPreviousCycleAnalysis,
  type PreviousCycleObjective,
  type AbandonedKr,
  type KpiTrend,
  type PreviousCycleAnalysis,
} from './useTeamPreviousCycleAnalysis';
export { useManagersPanorama, useCrossDependencies } from './useManagersPanorama';
export { useTeamKeyResult, type TeamKeyResultData } from './useTeamKeyResult';

// =========================
// ORG VIEW - DEPRECATED: use useOrgObjectiveView from './queries' instead
// =========================
export { useOrgOkrsForContext } from './useOrgOkrsForContext';

// =========================
// WIZARD HOOKS
// =========================
export { 
  useWizardDraft, 
  type WizardStep, 
  type WizardAiInsight, 
  type ObjectiveValidationFeedback,
  type DetectedDependencyDraft,
  type ShareStepContent,
} from './useWizardDraft';
export { useKrWizardDraft, type KrWizardStep } from './useKrWizardDraft';
export { useGenericWizardDraft } from './useGenericWizardDraft';
export { useRitualHistory, useRitualDetail, useUpdateDecisionFollowUp, WIZARD_TYPE_LABELS } from './useRitualHistory';
export { useCanResolveDecision } from './useCanResolveDecision';
export { useDecisionThread } from './useDecisionThread';
export { useMyPendingDecisions, type PendingDecisionItem } from './useMyPendingDecisions';
export { useCarryOverDecisions } from './useCarryOverDecisions';
export { useMbrPreSubmissions, type UseMbrPreSubmissionsResult } from './useMbrPreSubmissions';
export {
  useDecisionsInbox,
  useDecisionsScopeContext,
  type DecisionsInboxScope,
  type DecisionsInboxFilters,
  type DecisionsInboxItem,
  type DecisionsInboxResult,
} from './useDecisionsInbox';
export { useWizardAI } from './useWizardAI';
export { useWizardOrchestrator } from './useWizardOrchestrator';
export { useWizardSession } from './useWizardSession';
export { useLastCompletedSession } from './useLastCompletedSession';
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
export { useOrgConstructionReview } from './useOrgConstructionReview';
export { useFullConstructionReview } from './useFullConstructionReview';

// =========================
// KR STATE INSIGHTS
// =========================
export {
  calculateKrState,
  getKrStateConfig,
  groupKrStatesBySeverity,
  filterKrsRequiringAttention,
  filterKrsForCelebration,
  sortByStatePriority,
  KR_STATE_CONFIG,
  KR_STATE_PRIORITY_ORDER,
  type KrState,
  type KrStateConfig,
  type KrStateSeverity,
  type CalculateKrStateParams,
} from './useKrStateInsights';

// =========================
// HEADER / CYCLE PROGRESS
// =========================
export { useHeaderCycleProgress, type HeaderQuarterProgress } from './useHeaderCycleProgress';

// =========================
// RITUALS — calendar / availability / preparation
// =========================
export { useSyncRitualCalendar } from './useSyncRitualCalendar';
export { useRitualAvailability, type RitualAvailability } from './useRitualAvailability';
export {
  useRitualPreparationStatus,
  type SupportedRitualType,
  type UseRitualPreparationStatusArgs,
  type UseRitualPreparationStatusReturn,
} from './useRitualPreparationStatus';
export {
  useMbrPreTeamProjects,
  type MbrPreProjectRow,
  type MbrPreMilestoneRow,
  type UseMbrPreTeamProjectsResult,
} from './useMbrPreTeamProjects';

// =========================
// PROPOSAL / SESSION / COMPANY OKRs
// =========================
export {
  useProposalValidation,
  type ProposalValidationInput,
  type ProposalValidationState,
} from './useProposalValidation';
export {
  useCompletedSessionForCycle,
  type CompletedSessionData,
} from './useCompletedSessionForCycle';
export { useCompanyOkrs } from './useCompanyOkrs';

// =========================
// WEEKLY ritual aggregations
// =========================
export {
  useWeeklyOpeningCuration,
  type UseWeeklyOpeningCurationParams,
  type UseWeeklyOpeningCurationReturn,
} from './useWeeklyOpeningCuration';
export {
  useWeeklyPreWeeklyAggregation,
  type WeeklyAggregationCoverage,
  type UseWeeklyPreWeeklyAggregationReturn,
} from './useWeeklyPreWeeklyAggregation';
export { useMbrPreMonthAnalysis } from './useMbrPreMonthAnalysis';
export {
  useMbrPreTeamKpisMonthly,
  type UseMbrPreTeamKpisMonthlyResult,
} from './useMbrPreTeamKpisMonthly';
export {
  useMbrMonthlyKpisByScope,
  type UseMbrMonthlyKpisByScopeResult,
  type MbrMonthlyKpiSnapshot,
  type KpiScope,
} from './useMbrMonthlyKpisByScope';
export {
  useMbrOpeningCuration,
  type UseMbrOpeningCurationParams,
  type UseMbrOpeningCurationReturn,
} from './useMbrOpeningCuration';

// =========================
// SHARED TYPES re-exported for convenience
// =========================
export type { WizardKr, LatestCheckinData } from './useTeamPendingKrs';

// =========================
// RITUAL GREETING (Step 1 — saudação contextual)
// =========================
export {
  useRitualGreetingContext,
  type RitualGreetingContext,
} from './useRitualGreetingContext';
export {
  useCollaboratorOpeningSignals,
  type CollaboratorOpeningSignals,
} from './useCollaboratorOpeningSignals';
export {
  useCollaboratorInitiativesSignal,
  type CollaboratorInitiativesSignal,
} from './useCollaboratorInitiativesSignal';
