/**
 * Integrations Module Hooks Barrel
 * 
 * Consolidated exports from all integration-related hooks.
 * All imports should come from this file, NOT from individual hook files.
 * 
 * @see docs/canonical/DEVELOPMENT_STANDARDS.md (Section K: Hooks e Barrel Files)
 */

// Core integrations
export * from "./useIntegrations";

// Agent documents
export { 
  useAgentDocuments, 
  useUploadAgentDocument, 
  useDeleteAgentDocument 
} from "./useAgentDocuments";

// Instruction sources
export { 
  useInstructionSources, 
  useCreateInstructionSource, 
  useUpdateInstructionSource, 
  useDeleteInstructionSource,
  type InstructionSourceRow,
} from "./useInstructionSources";

// Performance metrics
export { 
  usePerfMetricsLatest, 
  usePerfMetricsHistory, 
  collectPerfMetricsManually, 
  type TableMetric, 
  type UnusedIndex 
} from "./usePerfMetrics";
