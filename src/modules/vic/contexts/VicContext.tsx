import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { VicAgentSlug, VicActionContext, VicContext, VicInvokeResponse } from "../types";
import { VIC_AGENTS } from "../types";

interface VicPanelState {
  isOpen: boolean;
  agentSlug: VicAgentSlug | null;
  actionContext: VicActionContext | null;
  context: VicContext | null;
  response: VicInvokeResponse | null;
  isLoading: boolean;
  onApply?: (response: string) => void;
}

/**
 * Generate a history key from context for session-based caching
 */
function getHistoryKeyFromContext(context: VicContext | null): string {
  if (!context) return 'unknown';
  const titleSlug = (context.title || 'untitled').slice(0, 30).toLowerCase().replace(/\s+/g, '-');
  return `${context.type}-${titleSlug}`;
}

interface VicContextType {
  panelState: VicPanelState;
  openPanel: (params: {
    agentSlug: VicAgentSlug;
    actionContext: VicActionContext;
    context: VicContext;
    onApply?: (response: string) => void;
  }) => void;
  closePanel: () => void;
  setResponse: (response: VicInvokeResponse | null) => void;
  setLoading: (isLoading: boolean) => void;
  getAgentInfo: (slug: VicAgentSlug) => typeof VIC_AGENTS[VicAgentSlug];
  /** Session-based response history (in memory) */
  responseHistory: Map<string, VicInvokeResponse>;
  /** Save response to session history */
  saveToHistory: (context: VicContext, response: VicInvokeResponse) => void;
  /** Get response from session history */
  getFromHistory: (context: VicContext) => VicInvokeResponse | null;
  /** Generate history key from context */
  getHistoryKey: (context: VicContext) => string;
}

const VicContext = createContext<VicContextType | undefined>(undefined);

const initialState: VicPanelState = {
  isOpen: false,
  agentSlug: null,
  actionContext: null,
  context: null,
  response: null,
  isLoading: false,
  onApply: undefined,
};

export function VicProvider({ children }: { children: ReactNode }) {
  const [panelState, setPanelState] = useState<VicPanelState>(initialState);
  const [responseHistory] = useState<Map<string, VicInvokeResponse>>(() => new Map());

  const openPanel = useCallback(
    ({
      agentSlug,
      actionContext,
      context,
      onApply,
    }: {
      agentSlug: VicAgentSlug;
      actionContext: VicActionContext;
      context: VicContext;
      onApply?: (response: string) => void;
    }) => {
      setPanelState({
        isOpen: true,
        agentSlug,
        actionContext,
        context,
        response: null,
        isLoading: false,
        onApply,
      });
    },
    []
  );

  const closePanel = useCallback(() => {
    setPanelState(initialState);
  }, []);

  const setResponse = useCallback((response: VicInvokeResponse | null) => {
    setPanelState((prev) => ({ ...prev, response }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setPanelState((prev) => ({ ...prev, isLoading }));
  }, []);

  const getAgentInfo = useCallback((slug: VicAgentSlug) => {
    return VIC_AGENTS[slug];
  }, []);

  const getHistoryKey = useCallback((context: VicContext) => {
    return getHistoryKeyFromContext(context);
  }, []);

  const saveToHistory = useCallback((context: VicContext, response: VicInvokeResponse) => {
    const key = getHistoryKeyFromContext(context);
    responseHistory.set(key, response);
  }, [responseHistory]);

  const getFromHistory = useCallback((context: VicContext): VicInvokeResponse | null => {
    const key = getHistoryKeyFromContext(context);
    return responseHistory.get(key) || null;
  }, [responseHistory]);

  return (
    <VicContext.Provider
      value={{
        panelState,
        openPanel,
        closePanel,
        setResponse,
        setLoading,
        getAgentInfo,
        responseHistory,
        saveToHistory,
        getFromHistory,
        getHistoryKey,
      }}
    >
      {children}
    </VicContext.Provider>
  );
}

export function useVic() {
  const context = useContext(VicContext);
  if (context === undefined) {
    throw new Error("useVic must be used within a VicProvider");
  }
  return context;
}
