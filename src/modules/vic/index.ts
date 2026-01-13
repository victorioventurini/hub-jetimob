// Vic IA Module - Main exports

// Types
export * from "./types";

// Context
export { VicProvider, useVic } from "./contexts/VicContext";
export { VicTypewriterQueueProvider, useVicTypewriterQueue } from "./contexts/VicTypewriterQueue";

// Hooks
export { useVicAgent, useVicEnabled, useVicConfig, useVicAgentActivations } from "./hooks/useVicAgent";
export { useVicStream } from "./hooks/useVicStream";
export { useAskToVic } from "./hooks/useAskToVic";
export { 
  useVicFeedbackDraft, 
  cleanupExpiredVicDrafts,
  type VicFeedbackDraft,
  type VicFeedbackEntityType,
} from "./hooks/useVicFeedbackDraft";

// Components
export { VicActionButton } from "./components/VicActionButton";
export { AskToVic, AskToVicInline, AskToVicStepHelper } from "./components/AskToVic";
export { VicSidepanel } from "./components/VicSidepanel";
export { BuIaSettings } from "./components/BuIaSettings";
export { VicAuditPage } from "./components/VicAuditPage";
export { VicTypewriterText, VicTypewriterBlock, VicStreamingText } from "./components/VicTypewriterText";
export { VicLoadingState, VicGeneratingCard } from "./components/VicLoadingState";
export { VicErrorState } from "./components/VicErrorState";

// Types
export type * from "./types/ask-to-vic";
