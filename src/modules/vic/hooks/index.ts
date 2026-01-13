// Vic hooks barrel export

export { useVicAgent, useVicEnabled, useVicConfig, useVicAgentActivations } from './useVicAgent';
export { useVicStream } from './useVicStream';
export { useAskToVic } from './useAskToVic';
export { 
  useVicFeedbackDraft, 
  cleanupExpiredVicDrafts,
  type VicFeedbackDraft,
  type VicFeedbackEntityType,
  type UseVicFeedbackDraftOptions,
  type UseVicFeedbackDraftReturn,
} from './useVicFeedbackDraft';
