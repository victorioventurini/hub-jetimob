/**
 * KPI Components - Barrel Export
 * v2.83.0: Added contributor management and context sections
 * v2.84.0: Added LinkedKrsSection for reverse KR lookup
 * v2.86.0: Added KpiTargetHistorySection for target/benchmark change tracking
 * v2.86.0: Added KpiEvolutionChart, KpiValuesTable, KpiHistoryDialog for evolution visualization
 */

export { KpiSidePanel } from './KpiSidePanel';
export { KpiContextSection } from './KpiContextSection';
export type { KpiContextSectionProps, KpiContextVariant } from './KpiContextSection';
export { KpiContributorsManager } from './KpiContributorsManager';
export type { KpiContributorsManagerProps } from './KpiContributorsManager';
export { LinkedKrsSection } from './LinkedKrsSection';
export { KpiTargetHistorySection } from './KpiTargetHistorySection';

// v2.86.0: Evolution visualization components
export { KpiEvolutionChart } from './KpiEvolutionChart';
export type { KpiEvolutionChartProps } from './KpiEvolutionChart';
export { KpiValuesTable } from './KpiValuesTable';
export type { KpiValuesTableProps } from './KpiValuesTable';
export { KpiHistoryDialog } from './KpiHistoryDialog';
export type { KpiHistoryDialogProps, KpiHistoryDialogData } from './KpiHistoryDialog';
