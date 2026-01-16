// Vic IA Module - Main exports

// Types
export * from "./types";
export type * from "./types/ask-to-vic";

// Context
export { VicProvider, useVic } from "./contexts/VicContext";
export { VicTypewriterQueueProvider, useVicTypewriterQueue } from "./contexts/VicTypewriterQueue";

// Hooks - consolidated barrel export
export * from "./hooks";

// Components
export { VicActionButton } from "./components/VicActionButton";
export { AskToVic, AskToVicInline, AskToVicStepHelper } from "./components/AskToVic";
export { VicSidepanel } from "./components/VicSidepanel";
export { BuIaSettings } from "./components/BuIaSettings";
export { VicAuditPage } from "./components/VicAuditPage";
export { VicTypewriterText, VicTypewriterBlock, VicStreamingText } from "./components/VicTypewriterText";
export { VicLoadingState, VicGeneratingCard } from "./components/VicLoadingState";
export { VicErrorState } from "./components/VicErrorState";
