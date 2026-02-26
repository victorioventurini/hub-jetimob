/**
 * Events Context — state local para oportunidades em sessão
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Opportunity, WebhookConfig, WebhookLog, ViewMode, EventsFilters } from "../types";
import { OPPORTUNITIES_MOCK } from "../mocks/opportunities";
import { simulateWebhookSend } from "../utils/webhook";

interface EventsContextValue {
  // Opportunities
  opportunities: Opportunity[];
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

  return (
    <EventsContext.Provider
      value={{
        opportunities,
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
