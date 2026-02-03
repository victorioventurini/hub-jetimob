// KPIs module hooks barrel export
// v2.82.0: Added useTeamArea for area auto-inference
// v2.83.0: Added useKpiContributors, useKpisForWizardV2 for wizard integration

export { useKpiData, useKpiDetail } from "./useKpiData";
export { useKpiMutations } from "./useKpiMutations";
export { useKpisForWizard } from "./useKpisForWizard";
export { useKpisForWizardV2 } from "./useKpisForWizardV2";
export { useKpiContributors, useUserContributedKpis } from "./useKpiContributors";
export { useTeamArea } from "./useTeamArea";

// Types
export type { KpiForWizard, UseKpisForWizardOptions, UseKpisForWizardResult } from "./useKpisForWizard";
export type { UseKpiContributorsOptions, AddContributorParams, RemoveContributorParams } from "./useKpiContributors";
