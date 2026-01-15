// OKR Module Exports
// Hooks are exported from ./hooks barrel file
export * from './hooks/useOkrStatus';
export * from './hooks/useOkrMutations';
export * from './hooks/usePendingCheckins';
export * from './hooks/useCycleCheckins';
export * from './hooks/useInitiatives';
export * from './hooks/useOkrContributions';
export * from './hooks/useOkrKrMetrics';
export * from './hooks/useOkrHealth';
export * from './types';
export * from './types/initiative';
export * from './types/health';
export * from './utils/krValidation';

// Re-export consolidated queries from barrel
export {
  // Core queries
  useOrgObjectives,
  useOrgObjective,
  useOrgKeyResults,
  useTeamObjectives,
  useTeamKeyResults,
  useMyTeamKeyResults,
  useMyTeamObjectives,
  useKrCheckins,
  useLatestCheckinDate,
  useTeams,
  useCycles,
  useUserProfile,
  // Aggregate queries
  useTeamContributedOkrs,
  useSharedOkrsSummary,
  useSharedOkrsInsights,
  useObjectiveContributors,
  useTeamContributedObjectives,
  useTeamObjectivesWithSharedInfo,
  useManageContributors,
  // Types
  type OkrContributor,
} from './hooks/queries';

// Components
export { CheckinDialog } from './components/CheckinDialog';
export { OkrProgressBar } from './components/OkrProgressBar';
export { OkrStatusBadge } from './components/OkrStatusBadge';
export { OkrObjectiveCard } from './components/OkrObjectiveCard';
export { OkrEmptyState } from './components/OkrEmptyState';
export { OkrAlertsCard } from './components/OkrAlertsCard';
export { TeamCheckinSettings } from './components/TeamCheckinSettings';
export { CycleRetrospectiveDialog } from './components/CycleRetrospectiveDialog';
export { SharedOkrBadge } from './components/SharedOkrBadge';
export { SharedOkrInsights } from './components/SharedOkrInsights';
export { KrHistoryDialog } from './components/KrHistoryDialog';
export { KrCheckinsTable } from './components/KrCheckinsTable';
export { KrEvolutionChart } from './components/KrEvolutionChart';
export * from './components/team-view';
export * from './components/initiatives';

// Pages
export { default as OkrDashboardPage } from './pages/OkrsPage';
export { default as ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
export { default as CycleCheckinsPage } from './pages/CycleCheckinsPage';
export { default as OkrHealthPage } from './pages/OkrHealthPage';
