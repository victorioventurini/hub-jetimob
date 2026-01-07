import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type {
  BuPermissionGroupConfig,
  BuUserPermissionGroup,
  BuUserPermissionOverride,
  EffectivePermission,
} from "../types";

export function useBuGroupConfigs() {
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.permissions.buConfigs(buId);

  const { data: configs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("bu_permission_group_configs")
        .select("id, bu_id, group_id, is_enabled, created_at, updated_at, permission_groups(id, name, description, status)")
        .eq("bu_id", buId);

      if (error) throw error;
      return data as BuPermissionGroupConfig[];
    },
    enabled: isReady && !!buId,
  });

  const toggleGroupEnabled = useMutation({
    mutationFn: async ({
      groupId,
      isEnabled,
    }: {
      groupId: string;
      isEnabled: boolean;
    }) => {
      if (!supabase || !buId) throw new Error("BU não selecionada");

      // Check if config exists
      const { data: existing } = await supabase
        .from("bu_permission_group_configs")
        .select("id")
        .eq("bu_id", buId)
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
            bu_id: buId,
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
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.permissions.userGroups(buId, userId);

  const { data: userGroups = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];

      const { data, error } = await supabase
        .from("bu_user_permission_groups")
        .select("id, bu_id, user_id, group_id, created_at, permission_groups(id, name, description, status)")
        .eq("bu_id", buId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as BuUserPermissionGroup[];
    },
    enabled: isReady && !!buId && !!userId,
  });

  const setUserGroups = useMutation({
    mutationFn: async ({
      userId,
      groupIds,
    }: {
      userId: string;
      groupIds: string[];
    }) => {
      if (!supabase || !buId) throw new Error("BU não selecionada");

      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("bu_user_permission_groups")
        .delete()
        .eq("bu_id", buId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (groupIds.length > 0) {
        const { error: insertError } = await supabase
          .from("bu_user_permission_groups")
          .insert(
            groupIds.map((groupId) => ({
              bu_id: buId,
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
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.permissions.userOverrides(buId, userId);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];

      const { data, error } = await supabase
        .from("bu_user_permission_overrides")
        .select("id, bu_id, user_id, permission_id, effect, created_at, permission_catalog(id, key, module, resource, action, scope, description)")
        .eq("bu_id", buId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as BuUserPermissionOverride[];
    },
    enabled: isReady && !!buId && !!userId,
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
      if (!supabase || !buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("bu_user_permission_overrides")
        .insert({
          bu_id: buId,
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
      if (!supabase) throw new Error("BU não selecionada");

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
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: effectivePermissions = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.userEffective(buId, userId),
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];

      const { data, error } = await supabase
        .from("user_effective_permissions")
        .select("user_id, bu_id, permission_id, permission_key, module, resource, action, scope, source, source_name")
        .eq("bu_id", buId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as unknown as EffectivePermission[];
    },
    enabled: isReady && !!buId && !!userId,
  });

  return {
    effectivePermissions,
    isLoading,
  };
}
