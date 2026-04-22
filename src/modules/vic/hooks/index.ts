// Vic hooks barrel export

export { useVicAgent, useVicEnabled, useVicConfig, useVicAgentActivations } from './useVicAgent';
export { useVicStream } from './useVicStream';
export { useAskToVic } from './useAskToVic';
export { useAiSection, type AiSlotConfig, type UseAiSectionOptions, type UseAiSectionResult } from './useAiSection';
export { 
  useVicFeedbackDraft, 
  cleanupExpiredVicDrafts,
  type VicFeedbackDraft,
  type VicFeedbackEntityType,
  type UseVicFeedbackDraftOptions,
  type UseVicFeedbackDraftReturn,
} from './useVicFeedbackDraft';
