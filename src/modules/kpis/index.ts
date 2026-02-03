// =============================================
// MÓDULO KPIs - EXPORTS
// =============================================

// Types
export * from './types';

// Hooks  
export * from './hooks';

// Components
export { KpiCard } from './components/KpiCard';
export { KpiAreaSection } from './components/KpiAreaSection'; // v2.82.0: replaces KpiCategorySection
/** @deprecated v2.82.0 - Use KpiAreaSection instead */
export { KpiCategorySection } from './components/KpiCategorySection';
export { KpiDashboardFilters } from './components/KpiDashboardFilters';
export { KpiStatusSummary } from './components/KpiStatusSummary';
export { KpiDetailDialog } from './components/KpiDetailDialog';
export { CreateKpiDialog } from './components/CreateKpiDialog';
export { EditKpiDialog } from './components/EditKpiDialog';
export { AddKpiValueDialog } from './components/AddKpiValueDialog';
export { KpiActionsMenu } from './components/KpiActionsMenu';

// Pages (lazy loaded)
// KpiDashboardPage
