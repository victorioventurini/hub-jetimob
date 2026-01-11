import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

// ========================
// ORG OBJECTIVES MUTATIONS
// ========================

/**
 * Cancela (não exclui) um objetivo organizacional.
 * Altera o status para 'cancelled' preservando histórico.
 */
export function useCancelOrgObjective() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from("okr_org_objectives")
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation (all BUs, all years, all teams)
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
      toast.success("Objetivo organizacional cancelado");
    },
    onError: () => {
      toast.error("Erro ao cancelar objetivo");
    },
  });
}

/**
 * Cancela (não exclui) um KR organizacional.
 * Usa cancelled_at em vez de status pois KRs têm RAG status.
 */
export function useCancelOrgKeyResult() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (krId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from("okr_org_key_results")
        .update({ 
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
      toast.success("Key Result cancelado");
    },
    onError: () => {
      toast.error("Erro ao cancelar KR");
    },
  });
}

// ========================
// TEAM OBJECTIVES MUTATIONS
// ========================

/**
 * Cancela (não exclui) um objetivo de time.
 */
export function useCancelTeamObjective() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from("okr_team_objectives")
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
      toast.success("Objetivo de time cancelado");
    },
    onError: () => {
      toast.error("Erro ao cancelar objetivo");
    },
  });
}

/**
 * Cancela (não exclui) um KR de time.
 * Usa cancelled_at em vez de status pois KRs têm RAG status.
 */
export function useCancelTeamKeyResult() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (krId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from("okr_team_key_results")
        .update({ 
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
      toast.success("Key Result cancelado");
    },
    onError: () => {
      toast.error("Erro ao cancelar KR");
    },
  });
}
