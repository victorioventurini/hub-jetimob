import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
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

export function useVicAgent(options?: UseVicAgentOptions) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const [lastResponse, setLastResponse] = useState<VicInvokeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      agentSlug,
      actionContext,
      context,
      userQuestion,
    }: {
      agentSlug: VicAgentSlug;
      actionContext: VicActionContext;
      context: VicContext;
      userQuestion?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke<VicInvokeResponse>("invoke-vic", {
        body: {
          agentSlug,
          buId: currentBu?.id,
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
    onError: (error: VicError | Error) => {
      console.error("Vic agent error:", error);
      
      // Handle specific error codes
      if ("code" in error) {
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
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error("Erro ao consultar Vic");
        options?.onError?.({ error: errorMessage });
      }
    },
  });

  const invoke = useCallback(
    (
      agentSlug: VicAgentSlug,
      actionContext: VicActionContext,
      context: VicContext,
      userQuestion?: string
    ) => {
      return mutation.mutateAsync({ agentSlug, actionContext, context, userQuestion });
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
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  const { data: iaConfig, isLoading } = useQuery({
    queryKey: ["bu-ia-config", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return null;

      const { data, error } = await supabase
        .from("bu_ia_config")
        .select("*")
        .eq("bu_id", currentBu.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      return data as BuIaConfig | null;
    },
    enabled: !!currentBu?.id,
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
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<BuIaConfig>) => {
      if (!currentBu?.id) throw new Error("No BU selected");

      // Check if config exists
      const { data: existing } = await supabase
        .from("bu_ia_config")
        .select("id")
        .eq("bu_id", currentBu.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("bu_ia_config")
          .update(updates)
          .eq("bu_id", currentBu.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("bu_ia_config")
          .insert({ bu_id: currentBu.id, ...updates });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bu-ia-config", currentBu?.id] });
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
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  const { data: activations, isLoading } = useQuery({
    queryKey: ["bu-agent-activations", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return [];

      const { data, error } = await supabase
        .from("bu_agent_activations")
        .select("*, agent:ai_agents(id, name, slug, description)")
        .eq("bu_id", currentBu.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentBu?.id,
  });

  const toggleAgent = useMutation({
    mutationFn: async ({ agentId, isEnabled }: { agentId: string; isEnabled: boolean }) => {
      if (!currentBu?.id) throw new Error("No BU selected");

      // Check if activation exists
      const { data: existing } = await supabase
        .from("bu_agent_activations")
        .select("id")
        .eq("bu_id", currentBu.id)
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
          bu_id: currentBu.id,
          agent_id: agentId,
          is_enabled: isEnabled,
          enabled_by: user.user?.id,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bu-agent-activations", currentBu?.id] });
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
