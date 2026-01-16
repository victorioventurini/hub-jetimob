// Integrations module hooks barrel export

export * from "./useIntegrations";
export { useAgentDocuments } from "./useAgentDocuments";
export { useInstructionSources } from "./useInstructionSources";
export { 
  usePerfMetricsLatest, 
  usePerfMetricsHistory, 
  collectPerfMetricsManually, 
  type TableMetric, 
  type UnusedIndex 
} from "./usePerfMetrics";
