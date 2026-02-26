/**
 * Events Context — state local para oportunidades em sessão
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Opportunity, WebhookConfig, WebhookLog, ViewMode, EventsFilters } from "../types";
import { OPPORTUNITIES_MOCK } from "../mocks/opportunities";
import { JOURNEYS_MOCK, EVENTS_MOCK } from "../mocks/events";
import { simulateWebhookSend } from "../utils/webhook";

interface EventsContextValue {
  // Opportunities
  opportunities: Opportunity[];
  filteredOpportunities: Opportunity[];
  filteredEvents: typeof EVENTS_MOCK;
  addOpportunity: (opp: Omit<Opportunity, "id" | "capturedAt">) => void;
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  // Filters
  filters: EventsFilters;
  setFilters: (filters: EventsFilters) => void;
  // Webhook
  webhookConfig: WebhookConfig;
  setWebhookConfig: (config: WebhookConfig) => void;
  webhookLogs: WebhookLog[];
  sendTestWebhook: (payload: Record<string, unknown>) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(OPPORTUNITIES_MOCK);
  const [viewMode] = useState<ViewMode>("sponsor");
  const setViewMode = useCallback((_mode: ViewMode) => { /* locked to sponsor */ }, []);
  const [filters, setFilters] = useState<EventsFilters>({ scope: "journey", selectedJourneyId: "jrn-journey-2026", year: 2026 });
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: "https://hooks.example.com/jet-experience",
    secret: "whsec_mock_secret_key_123",
    isActive: true,
  });
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

  const addOpportunity = useCallback((opp: Omit<Opportunity, "id" | "capturedAt">) => {
    const newOpp: Opportunity = {
      ...opp,
      id: `opp-${Date.now()}`,
      capturedAt: new Date().toISOString(),
    };
    setOpportunities((prev) => [newOpp, ...prev]);

    // Auto-send webhook if active
    if (webhookConfig.isActive) {
      const log = simulateWebhookSend(newOpp as unknown as Record<string, unknown>);
      setWebhookLogs((prev) => [log, ...prev]);
    }
  }, [webhookConfig.isActive]);

  const sendTestWebhook = useCallback((payload: Record<string, unknown>) => {
    const log = simulateWebhookSend(payload);
    setWebhookLogs((prev) => [log, ...prev]);
  }, []);

  const filteredOpportunities = useMemo(() => {
    if (filters.scope === "event" && filters.selectedEventId) {
      return opportunities.filter((o) => o.eventId === filters.selectedEventId);
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        return opportunities.filter((o) => journey.eventIds.includes(o.eventId));
      }
    }
    return opportunities;
  }, [opportunities, filters.scope, filters.selectedEventId, filters.selectedJourneyId]);

  const filteredEvents = useMemo(() => {
    if (filters.scope === "event" && filters.selectedEventId) {
      return EVENTS_MOCK.filter((e) => e.id === filters.selectedEventId);
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        return EVENTS_MOCK.filter((e) => journey.eventIds.includes(e.id));
      }
    }
    return EVENTS_MOCK;
  }, [filters.scope, filters.selectedEventId, filters.selectedJourneyId]);

  return (
    <EventsContext.Provider
      value={{
        opportunities,
        filteredOpportunities,
        filteredEvents,
        addOpportunity,
        viewMode,
        setViewMode,
        filters,
        setFilters,
        webhookConfig,
        setWebhookConfig,
        webhookLogs,
        sendTestWebhook,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEventsContext(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEventsContext must be used within EventsProvider");
  return ctx;
}
