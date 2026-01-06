import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { Permission, PermissionScope, PermissionStatus } from "../types";

export function usePermissionCatalog() {
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: queryKeys.permissions.catalog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_catalog")
        .select("*")
        .order("module")
        .order("resource")
        .order("action");

      if (error) throw error;
      return data as Permission[];
    },
  });

  const createPermission = useMutation({
    mutationFn: async (input: {
      key: string;
      module: string;
      resource: string;
      action: string;
      scope: PermissionScope;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("permission_catalog")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.catalog() });
      toast.success("Permissão criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar permissão: ${error.message}`);
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Permission> & { id: string }) => {
      const { data, error } = await supabase
        .from("permission_catalog")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.catalog() });
      toast.success("Permissão atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissão: ${error.message}`);
    },
  });

  const togglePermissionStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PermissionStatus;
    }) => {
      const { data, error } = await supabase
        .from("permission_catalog")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.catalog() });
      toast.success(
        status === "active" ? "Permissão ativada" : "Permissão desativada"
      );
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Group permissions by module for easier display
  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  const modules = [...new Set(permissions.map((p) => p.module))].sort();

  return {
    permissions,
    permissionsByModule,
    modules,
    isLoading,
    error,
    createPermission,
    updatePermission,
    togglePermissionStatus,
  };
}
