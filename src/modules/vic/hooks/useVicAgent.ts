import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as authSupabase } from "@/integrations/supabase/client";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type {
  VicAgentSlug,
  VicActionContext,
  VicContext,
  VicInvokeResponse,
  VicError,
  BuIaConfig,
} from "../types";

interface UseVicAgentOptions {
  onSuccess?: (response: VicInvokeResponse) => void;
  onError?: (error: VicError) => void;
}

export interface VicInvokeOptions {
  /**
   * When true, suppress user-facing toasts for this invocation.
   * Useful for optional/"nice-to-have" AI enrichments where fallback exists.
   */
  silent?: boolean;
}

export function useVicAgent(options?: UseVicAgentOptions) {
  const { currentBu, currentBuId } = useBu();
  const [lastResponse, setLastResponse] = useState<VicInvokeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      agentSlug,
      actionContext,
      context,
      userQuestion,
      silent,
    }: {
      agentSlug: VicAgentSlug;
      actionContext: VicActionContext;
      context: VicContext;
      userQuestion?: string;
      silent?: boolean;
    }) => {
      const buId = currentBu?.id ?? currentBuId;
      if (!buId) {
        throw new Error("No BU selected");
      }

      const { data, error } = await authSupabase.functions.invoke<VicInvokeResponse>("invoke-vic", {
        headers: { "x-current-bu-id": buId },
        body: {
          agentSlug,
          buId,
          actionContext,
          context,
          userQuestion,
        },
      });

      if (error) {
        throw error;
      }

      // Check for error response
      if (data && "error" in data) {
        const vicError = data as unknown as VicError;
        throw vicError;
      }

      return data as VicInvokeResponse;
    },
    onSuccess: (data) => {
      setLastResponse(data);
      options?.onSuccess?.(data);
    },
    onError: (error: VicError | Error, variables) => {
      const isSilent = !!variables?.silent;
      console.error("Vic agent error:", error);

      // Helpers
      const normalizeUnknownError = (e: unknown): VicError => {
        const status = (e as any)?.context?.status;
        const baseMessage = e instanceof Error ? e.message : "Erro desconhecido";
        const errorMessage = status ? `${baseMessage} (HTTP ${status})` : baseMessage;
        return { error: errorMessage };
      };

      // Silent mode: don't toast; still propagate via options?.onError for callers that care.
      if (isSilent) {
        if (error && typeof error === "object" && "code" in (error as any)) {
          options?.onError?.(error as VicError);
        } else {
          options?.onError?.(normalizeUnknownError(error));
        }
        return;
      }

      // Handle specific error codes
      if (error && typeof error === "object" && "code" in (error as any)) {
        const vicError = error as VicError;
        switch (vicError.code) {
          case "IA_DISABLED":
            toast.error("IA desabilitada nesta BU");
            break;
          case "AGENT_DISABLED":
            toast.error("Este agente está desabilitado nesta BU");
            break;
          case "USER_LIMIT_REACHED":
            toast.error(`Limite diário atingido (${vicError.limit} chamadas)`);
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
            toast.error(vicError.error || "Erro ao consultar Vic");
        }
        options?.onError?.(vicError);
      } else {
        const status = (error as any)?.context?.status;
        toast.error(status ? `Erro ao consultar Vic (HTTP ${status})` : "Erro ao consultar Vic");
        options?.onError?.(normalizeUnknownError(error));
      }
    },
  });

  const invoke = useCallback(
    (
      agentSlug: VicAgentSlug,
      actionContext: VicActionContext,
      context: VicContext,
      userQuestion?: string,
      invokeOptions?: VicInvokeOptions
    ) => {
      return mutation.mutateAsync({
        agentSlug,
        actionContext,
        context,
        userQuestion,
        silent: invokeOptions?.silent,
      });
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setLastResponse(null);
    mutation.reset();
  }, [mutation]);

  return {
    invoke,
    reset,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    response: lastResponse,
    error: mutation.error as VicError | null,
  };
}

// Hook to check if IA is enabled for current BU
export function useVicEnabled() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: iaConfig, isLoading } = useQuery({
    queryKey: queryKeys.vic.buConfig(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - config rarely changes
    queryFn: async () => {
      if (!supabase || !isReady || !buId) return null;

      const { data, error } = await supabase
        .from("bu_ia_config")
        .select(
          "id, bu_id, ia_enabled, ia_mode, max_calls_per_bu_day, max_calls_per_user_day, created_at, updated_at"
        )
        .eq("bu_id", buId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      return data as BuIaConfig | null;
    },
    enabled: !!buId && isReady,
  });

  // Default to enabled if no config exists
  const isEnabled = iaConfig?.ia_enabled ?? true;
  const iaMode = iaConfig?.ia_mode ?? "manual";

  return {
    isEnabled,
    iaMode,
    iaConfig,
    isLoading,
  };
}

// Hook to manage BU IA configuration
export function useVicConfig() {
  const { currentBu } = useBu();
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<BuIaConfig>) => {
      if (!supabase || !isReady || !buId) throw new Error("No BU selected");

      // Check if config exists
      const { data: existing } = await supabase
        .from("bu_ia_config")
        .select("id")
        .eq("bu_id", buId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase.from("bu_ia_config").update(updates).eq("bu_id", buId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("bu_ia_config").insert({ bu_id: buId, ...updates });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vic.buConfig(currentBu?.id ?? buId ?? null), refetchType: 'active' });
      toast.success("Configurações de IA atualizadas");
    },
    onError: (error) => {
      console.error("Error updating IA config:", error);
      toast.error("Erro ao atualizar configurações de IA");
    },
  });

  return {
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
}

// Hook to manage agent activations for a BU
export function useVicAgentActivations() {
  const { currentBu } = useBu();
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const { data: activations, isLoading } = useQuery({
    queryKey: queryKeys.vic.agentActivations(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !isReady || !buId) return [];

      const { data, error } = await supabase
        .from("bu_agent_activations")
        .select(
          "id, bu_id, agent_id, is_enabled, custom_system_prompt, enabled_by, created_at, updated_at, agent:ai_agents(id, name, slug, description)"
        )
        .eq("bu_id", buId);

      if (error) throw error;
      return data;
    },
    enabled: !!buId && isReady,
  });

  const toggleAgent = useMutation({
    mutationFn: async ({ agentId, isEnabled }: { agentId: string; isEnabled: boolean }) => {
      if (!supabase || !isReady || !buId) throw new Error("No BU selected");

      // Check if activation exists
      const { data: existing } = await supabase
        .from("bu_agent_activations")
        .select("id")
        .eq("bu_id", buId)
        .eq("agent_id", agentId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("bu_agent_activations")
          .update({ is_enabled: isEnabled })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase.from("bu_agent_activations").insert({
          bu_id: buId,
          agent_id: agentId,
          is_enabled: isEnabled,
          enabled_by: user.user?.id,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vic.agentActivations(currentBu?.id ?? buId ?? null), refetchType: 'active' });
      toast.success("Configuração do agente atualizada");
    },
    onError: (error) => {
      console.error("Error toggling agent:", error);
      toast.error("Erro ao atualizar agente");
    },
  });

  return {
    activations,
    isLoading,
    toggleAgent: toggleAgent.mutate,
    isToggling: toggleAgent.isPending,
  };
}

