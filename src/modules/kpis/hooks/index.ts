// KPIs module hooks barrel export
// v2.82.0: Added useTeamArea for area auto-inference
// v2.83.0: Added useKpiContributors, useKpisForWizardV2 for wizard integration
// v2.84.0: Added useKpiLinkedKrs for reverse KR lookup
// v2.85.0: Added useCanEditKpi for ownership-based edit permissions
// v2.86.0: Added useKpiTargetHistory for target/benchmark change tracking
// v2.86.0: Added useKpiWithHistory for evolution visualization
// v2.89.0: Added useKpiKrLinks for KR link filtering

export { useKpiData, useKpiDetail } from "./useKpiData";
export { useKpiMutations } from "./useKpiMutations";
export { useKpisForWizard } from "./useKpisForWizard";
export { useKpisForWizardV2 } from "./useKpisForWizardV2";
export { useKpiContributors, useUserContributedKpis } from "./useKpiContributors";
export { useTeamArea } from "./useTeamArea";
export { useKpiLinkedKrs } from "./useKpiLinkedKrs";
export { useCanEditKpi } from "./useCanEditKpi";
export { useKpiTargetHistory } from "./useKpiTargetHistory";
export { useKpiWithHistory } from "./useKpiWithHistory";
export { useKpiEvolutionList } from "./useKpiEvolutionList";
export { useKpiKrLinks } from "./useKpiKrLinks";

// Types
export type { KpiForWizard, UseKpisForWizardOptions, UseKpisForWizardResult } from "./useKpisForWizard";
export type { UseKpiContributorsOptions, AddContributorParams, RemoveContributorParams } from "./useKpiContributors";
export type { LinkedKrData, UseKpiLinkedKrsResult } from "./useKpiLinkedKrs";
export type { KpiTargetHistoryEntry, UseKpiTargetHistoryResult } from "./useKpiTargetHistory";
export type { KpiWithHistoryData } from "./useKpiWithHistory";
export type { KpiEvolutionItem, KpiEvolutionAggregates, UseKpiEvolutionListOptions, UseKpiEvolutionListResult } from "./useKpiEvolutionList";

// v2.83.0: Re-export V2 types from types file for convenience
export type { 
  KpiForWizardV2, 
  UseKpisForWizardV2Options, 
  UseKpisForWizardV2Result 
} from "../types";
