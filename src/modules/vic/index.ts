// Vic IA Module - Main exports

// Types
export * from "./types";

// Context
export { VicProvider, useVic } from "./contexts/VicContext";

// Hooks
export { useVicAgent, useVicEnabled, useVicConfig, useVicAgentActivations } from "./hooks/useVicAgent";

// Components
export { VicActionButton } from "./components/VicActionButton";
export { VicSidepanel } from "./components/VicSidepanel";
export { BuIaSettings } from "./components/BuIaSettings";
export { VicAuditPage } from "./components/VicAuditPage";
