// ============================================================
// USE USER GLOBAL ACTIONS - Mutations para gestão de usuários
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export function useResetOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.rpc("reset_user_onboarding", {
        target_profile_id: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
      toast.success("Onboarding resetado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao resetar onboarding: " + error.message);
    },
  });
}

export function useUpdateGlobalRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string | null }) => {
      const { error } = await supabase.rpc("update_user_global_role", {
        target_user_id: userId,
        new_role: role || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
      toast.success("Role global atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });
}

export function useAddBuAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      buId,
      roleInBu = "collaborator",
      isDefault = false,
    }: {
      userId: string;
      buId: string;
      roleInBu?: string;
      isDefault?: boolean;
    }) => {
      const { error } = await supabase.rpc("add_user_bu_access", {
        target_user_id: userId,
        target_bu_id: buId,
        p_role_in_bu: roleInBu,
        p_is_default: isDefault,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
      toast.success("Acesso à BU adicionado");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar acesso: " + error.message);
    },
  });
}

export function useRemoveBuAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, buId }: { userId: string; buId: string }) => {
      const { error } = await supabase.rpc("remove_user_bu_access", {
        target_user_id: userId,
        target_bu_id: buId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
      toast.success("Acesso à BU removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover acesso: " + error.message);
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.rpc("reactivate_user", {
        target_profile_id: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
      toast.success("Usuário reativado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao reativar usuário: " + error.message);
    },
  });
}
