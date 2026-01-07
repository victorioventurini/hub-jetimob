import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { PermissionGroup, PermissionGroupPermission, PermissionStatus } from "../types";

export function usePermissionGroups() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: queryKeys.permissions.groups(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as PermissionGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("permission_groups")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.groups() });
      toast.success("Grupo criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<PermissionGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from("permission_groups")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.groups() });
      toast.success("Grupo atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });

  const toggleGroupStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PermissionStatus;
    }) => {
      const { data, error } = await supabase
        .from("permission_groups")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.groups() });
      toast.success(status === "active" ? "Grupo ativado" : "Grupo desativado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    toggleGroupStatus,
  };
}

export function useGroupPermissions(groupId: string | null) {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  const { data: groupPermissions = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.groupPermissions(groupId),
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from("permission_group_permissions")
        .select("*, permission_catalog(*)")
        .eq("group_id", groupId);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const setGroupPermissions = useMutation({
    mutationFn: async ({
      groupId,
      permissionIds,
    }: {
      groupId: string;
      permissionIds: string[];
    }) => {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("permission_group_permissions")
        .delete()
        .eq("group_id", groupId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error: insertError } = await supabase
          .from("permission_group_permissions")
          .insert(
            permissionIds.map((permissionId) => ({
              group_id: groupId,
              permission_id: permissionId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.groupPermissions(null) });
      toast.success("Permissões do grupo atualizadas");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissões: ${error.message}`);
    },
  });

  return {
    groupPermissions,
    isLoading,
    setGroupPermissions,
  };
}
