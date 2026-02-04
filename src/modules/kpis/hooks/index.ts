// KPIs module hooks barrel export
// v2.82.0: Added useTeamArea for area auto-inference
// v2.83.0: Added useKpiContributors, useKpisForWizardV2 for wizard integration
// v2.84.0: Added useKpiLinkedKrs for reverse KR lookup

export { useKpiData, useKpiDetail } from "./useKpiData";
export { useKpiMutations } from "./useKpiMutations";
export { useKpisForWizard } from "./useKpisForWizard";
export { useKpisForWizardV2 } from "./useKpisForWizardV2";
export { useKpiContributors, useUserContributedKpis } from "./useKpiContributors";
export { useTeamArea } from "./useTeamArea";
export { useKpiLinkedKrs } from "./useKpiLinkedKrs";

// Types
export type { KpiForWizard, UseKpisForWizardOptions, UseKpisForWizardResult } from "./useKpisForWizard";
export type { UseKpiContributorsOptions, AddContributorParams, RemoveContributorParams } from "./useKpiContributors";
export type { LinkedKrData, UseKpiLinkedKrsResult } from "./useKpiLinkedKrs";

// v2.83.0: Re-export V2 types from types file for convenience
export type { 
  KpiForWizardV2, 
  UseKpisForWizardV2Options, 
  UseKpisForWizardV2Result 
} from "../types";
