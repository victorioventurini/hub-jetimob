/**
 * Events module barrel
 *
 * Public surface of the Events module: types, context, hooks and pages.
 * Internal components and utils stay in their subdirectories.
 *
 * @see docs/canonical/HOOKS_BARREL_STANDARD.md
 */

// Types
export * from "./types";

// Context
export { EventsProvider, useEventsContext } from "./context/EventsContext";

// Hooks
export * from "./hooks";

// Pages
export { default as EventSettingDetailPage } from "./pages/EventSettingDetailPage";
export { default as EventsCapturePage } from "./pages/EventsCapturePage";
export { default as EventsDashboardPage } from "./pages/EventsDashboardPage";
export { default as EventsOpportunitiesPage } from "./pages/EventsOpportunitiesPage";
export { default as EventsParticipantDetailPage } from "./pages/EventsParticipantDetailPage";
export { default as EventsParticipantsFullPage } from "./pages/EventsParticipantsFullPage";
export { default as EventsParticipantsPage } from "./pages/EventsParticipantsPage";
export { default as EventsSettingsPage } from "./pages/EventsSettingsPage";
export { default as EventsWebhookPage } from "./pages/EventsWebhookPage";
