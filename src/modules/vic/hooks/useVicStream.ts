/**
 * useVicStream - Hook para streaming SSE de respostas do Vic
 * 
 * Consome tokens progressivamente para respostas mais rápidas e fluidas.
 */

import { useState, useCallback, useRef } from "react";
import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/globalClient";
import { toast } from "sonner";
import type {
  VicAgentSlug,
  VicActionContext,
  VicContext,
  VicInvokeResponse,
  VicError,
} from "../types";

export interface UseVicStreamOptions {
  onToken?: (token: string, accumulated: string) => void;
  onComplete?: (response: VicInvokeResponse) => void;
  onError?: (error: VicError) => void;
}

export interface VicStreamState {
  isStreaming: boolean;
  response: string;
  metadata: Omit<VicInvokeResponse, "response"> | null;
  error: VicError | null;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-vic`;

export function useVicStream(options?: UseVicStreamOptions) {
  const { currentBu, currentBuId } = useBu();
  const [state, setState] = useState<VicStreamState>({
    isStreaming: false,
    response: "",
    metadata: null,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (
      agentSlug: VicAgentSlug,
      actionContext: VicActionContext,
      context: VicContext,
      userQuestion?: string
    ): Promise<VicInvokeResponse | null> => {
      const buId = currentBu?.id ?? currentBuId;
      if (!buId) {
        const error: VicError = { error: "No BU selected" };
        setState((s) => ({ ...s, error }));
        options?.onError?.(error);
        return null;
      }

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState({
        isStreaming: true,
        response: "",
        metadata: null,
        error: null,
      });

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        const resp = await fetch(STREAM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-current-bu-id": buId,
          },
          body: JSON.stringify({
            agentSlug,
            buId,
            actionContext,
            context,
            userQuestion,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        // Handle error responses
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          const error: VicError = {
            error: errorData.error || `HTTP ${resp.status}`,
            code: errorData.code,
          };
          
          handleError(error, resp.status);
          setState((s) => ({ ...s, isStreaming: false, error }));
          options?.onError?.(error);
          return null;
        }

        // Check if response is SSE stream
        const contentType = resp.headers.get("content-type") || "";
        
        if (!contentType.includes("text/event-stream")) {
          // Fallback to non-streaming response
          const data = await resp.json();
          const response: VicInvokeResponse = data;
          setState({
            isStreaming: false,
            response: response.response,
            metadata: {
              agentName: response.agentName,
              agentSlug: response.agentSlug,
              tokensUsed: response.tokensUsed,
              latencyMs: response.latencyMs,
            },
            error: null,
          });
          options?.onComplete?.(response);
          return response;
        }

        // Process SSE stream
        const reader = resp.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let metadata: Omit<VicInvokeResponse, "response"> | null = null;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process line-by-line
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              
              // Handle metadata event
              if (parsed.type === "metadata") {
                metadata = {
                  agentName: parsed.agentName,
                  agentSlug: parsed.agentSlug,
                  tokensUsed: parsed.tokensUsed,
                  latencyMs: parsed.latencyMs,
                };
                setState((s) => ({ ...s, metadata }));
                continue;
              }

              // Handle token delta
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                accumulated += content;
                setState((s) => ({ ...s, response: accumulated }));
                options?.onToken?.(content, accumulated);
              }
            } catch {
              // Incomplete JSON, put back in buffer
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Final flush
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                accumulated += content;
                setState((s) => ({ ...s, response: accumulated }));
                options?.onToken?.(content, accumulated);
              }
            } catch {
              /* ignore partial leftovers */
            }
          }
        }

        const finalResponse: VicInvokeResponse = {
          response: accumulated,
          agentName: metadata?.agentName || "",
          agentSlug: metadata?.agentSlug || agentSlug,
          tokensUsed: metadata?.tokensUsed,
          latencyMs: metadata?.latencyMs,
        };

        setState({
          isStreaming: false,
          response: accumulated,
          metadata,
          error: null,
        });

        options?.onComplete?.(finalResponse);
        return finalResponse;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setState((s) => ({ ...s, isStreaming: false }));
          return null;
        }

        const vicError: VicError = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
        
        setState((s) => ({ ...s, isStreaming: false, error: vicError }));
        toast.error("Erro ao consultar Vic");
        options?.onError?.(vicError);
        return null;
      }
    },
    [currentBu?.id, currentBuId, options]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      isStreaming: false,
      response: "",
      metadata: null,
      error: null,
    });
  }, [cancel]);

  return {
    stream,
    cancel,
    reset,
    isStreaming: state.isStreaming,
    response: state.response,
    metadata: state.metadata,
    error: state.error,
  };
}

function handleError(error: VicError, status: number) {
  switch (error.code) {
    case "IA_DISABLED":
      toast.error("IA desabilitada nesta BU");
      break;
    case "AGENT_DISABLED":
      toast.error("Este agente está desabilitado nesta BU");
      break;
    case "USER_LIMIT_REACHED":
      toast.error(`Limite diário atingido`);
      break;
    case "BU_LIMIT_REACHED":
      toast.error("Limite diário da BU atingido");
      break;
    case "RATE_LIMIT":
      toast.error("Muitas requisições. Tente novamente em alguns segundos.");
      break;
    case "NO_CREDITS":
      toast.error("Créditos de IA esgotados");
      break;
    default:
      if (status === 429) {
        toast.error("Muitas requisições. Tente novamente em alguns segundos.");
      } else if (status === 402) {
        toast.error("Créditos de IA esgotados");
      } else {
        toast.error(error.error || "Erro ao consultar Vic");
      }
  }
}
