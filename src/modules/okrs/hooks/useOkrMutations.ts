import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useIdentity } from "@/hooks/useIdentity";

/**
 * Mutations canônicas de cancelamento (soft) de OKRs/KRs.
 *
 * Padrão (TCR §OKRs + IDENTITY_CONVENTION v2.2):
 * - Objetivos: status='cancelled' + cancelled_at + cancelled_by (profiles.id)
 * - KRs:        status='cancelled' + cancelled_at + cancelled_by (profiles.id)
 *   (KRs também têm RAG status, mas a coluna `status` aceita 'cancelled'
 *    via enum `okr_rag_status` desde a unificação de estados de OKR.)
 *
 * Nunca usar `auth.uid()` direto: a FK cancelled_by aponta para profiles(id).
 */

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
  const { realProfileId } = useIdentity();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!realProfileId) throw new Error('Perfil não disponível');

      const { error } = await supabase
        .from("okr_org_objectives")
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: realProfileId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      toast.success("Objetivo organizacional cancelado");
    },
    onError: (error: Error) => {
      console.error('[useCancelOrgObjective]', error);
      toast.error("Erro ao cancelar objetivo", { description: error.message });
    },
  });
}

/**
 * Cancela (não exclui) um KR organizacional.
 * Soft-cancel via cancelled_at + cancelled_by (auditoria).
 */
export function useCancelOrgKeyResult() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();
  const { realProfileId } = useIdentity();

  return useMutation({
    mutationFn: async (krId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!realProfileId) throw new Error('Perfil não disponível');

      const { error } = await supabase
        .from("okr_org_key_results")
        .update({
          cancelled_at: new Date().toISOString(),
          cancelled_by: realProfileId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      toast.success("Key Result cancelado");
    },
    onError: (error: Error) => {
      console.error('[useCancelOrgKeyResult]', error);
      toast.error("Erro ao cancelar KR", { description: error.message });
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
  const { realProfileId } = useIdentity();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!realProfileId) throw new Error('Perfil não disponível');

      const { error } = await supabase
        .from("okr_team_objectives")
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: realProfileId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
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
  const { realProfileId } = useIdentity();

  return useMutation({
    mutationFn: async (krId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!realProfileId) throw new Error('Perfil não disponível');

      const { error } = await supabase
        .from("okr_team_key_results")
        .update({
          cancelled_at: new Date().toISOString(),
          cancelled_by: realProfileId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      toast.success("Key Result cancelado");
    },
    onError: (error: Error) => {
      console.error('[useCancelTeamKeyResult]', error);
      toast.error("Erro ao cancelar KR", { description: error.message });
    },
  });
}
