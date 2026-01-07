import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type {
  BuPermissionGroupConfig,
  BuUserPermissionGroup,
  BuUserPermissionOverride,
  EffectivePermission,
} from "../types";

export function useBuGroupConfigs() {
  const { currentBuId } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  const queryKey = queryKeys.permissions.buConfigs(currentBuId);

  const { data: configs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await supabase
        .from("bu_permission_group_configs")
        .select("*, permission_groups(*)")
        .eq("bu_id", currentBuId);

      if (error) throw error;
      return data as BuPermissionGroupConfig[];
    },
    enabled: !!currentBuId,
  });

  const toggleGroupEnabled = useMutation({
    mutationFn: async ({
      groupId,
      isEnabled,
    }: {
      groupId: string;
      isEnabled: boolean;
    }) => {
      if (!currentBuId) throw new Error("BU não selecionada");

      // Check if config exists
      const { data: existing } = await supabase
        .from("bu_permission_group_configs")
        .select("id")
        .eq("bu_id", currentBuId)
        .eq("group_id", groupId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("bu_permission_group_configs")
          .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bu_permission_group_configs")
          .insert({
            bu_id: currentBuId,
            group_id: groupId,
            is_enabled: isEnabled,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { isEnabled }) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(isEnabled ? "Grupo habilitado na BU" : "Grupo desabilitado na BU");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    configs,
    isLoading,
    toggleGroupEnabled,
  };
}

export function useBuUserGroups(userId: string | null) {
  const { currentBuId } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  const queryKey = queryKeys.permissions.userGroups(currentBuId, userId);

  const { data: userGroups = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentBuId || !userId) return [];

      const { data, error } = await supabase
        .from("bu_user_permission_groups")
        .select("*, permission_groups(*)")
        .eq("bu_id", currentBuId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as BuUserPermissionGroup[];
    },
    enabled: !!currentBuId && !!userId,
  });

  const setUserGroups = useMutation({
    mutationFn: async ({
      userId,
      groupIds,
    }: {
      userId: string;
      groupIds: string[];
    }) => {
      if (!currentBuId) throw new Error("BU não selecionada");

      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("bu_user_permission_groups")
        .delete()
        .eq("bu_id", currentBuId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (groupIds.length > 0) {
        const { error: insertError } = await supabase
          .from("bu_user_permission_groups")
          .insert(
            groupIds.map((groupId) => ({
              bu_id: currentBuId,
              user_id: userId,
              group_id: groupId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Grupos do usuário atualizados");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    userGroups,
    isLoading,
    setUserGroups,
  };
}

export function useBuUserOverrides(userId: string | null) {
  const { currentBuId } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  const queryKey = queryKeys.permissions.userOverrides(currentBuId, userId);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentBuId || !userId) return [];

      const { data, error } = await supabase
        .from("bu_user_permission_overrides")
        .select("*, permission_catalog(*)")
        .eq("bu_id", currentBuId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as BuUserPermissionOverride[];
    },
    enabled: !!currentBuId && !!userId,
  });

  const addOverride = useMutation({
    mutationFn: async ({
      userId,
      permissionId,
      effect = "allow",
    }: {
      userId: string;
      permissionId: string;
      effect?: "allow" | "deny";
    }) => {
      if (!currentBuId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("bu_user_permission_overrides")
        .insert({
          bu_id: currentBuId,
          user_id: userId,
          permission_id: permissionId,
          effect,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Override adicionado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const removeOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from("bu_user_permission_overrides")
        .delete()
        .eq("id", overrideId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Override removido");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    overrides,
    isLoading,
    addOverride,
    removeOverride,
  };
}

export function useUserEffectivePermissions(userId: string | null) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const { data: effectivePermissions = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.userEffective(currentBuId, userId),
    queryFn: async () => {
      if (!currentBuId || !userId) return [];

      const { data, error } = await supabase
        .from("user_effective_permissions")
        .select("*")
        .eq("bu_id", currentBuId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as EffectivePermission[];
    },
    enabled: !!currentBuId && !!userId,
  });

  return {
    effectivePermissions,
    isLoading,
  };
}
