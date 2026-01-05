import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import type { AssetPermission, AssetPermissionRole } from "../types";

export function useAssetPermissions() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buId = currentBu?.id;

  // Buscar permissões do usuário atual
  const { data: userPermissions = [], isLoading: isLoadingUserPermissions } = useQuery({
    queryKey: ["asset-permissions", "user", user?.id, buId],
    enabled: !!user?.id && !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_permissions")
        .select("*")
        .eq("bu_id", buId!)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data as AssetPermission[];
    },
  });

  // Buscar todas as permissões da BU (para admins)
  const { data: allPermissions = [], isLoading: isLoadingAllPermissions, refetch: refetchAllPermissions } = useQuery({
    queryKey: ["asset-permissions", "all", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data: permissions, error } = await supabase
        .from("asset_permissions")
        .select("*")
        .eq("bu_id", buId!);

      if (error) throw error;

      // Fetch user info separately
      const userIds = [...new Set((permissions || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, display_name, photo_url, work_email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, {
        id: p.user_id,
        full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
        avatar_url: p.photo_url,
        email: p.work_email,
      }]));

      return (permissions || []).map(p => ({
        ...p,
        user: profileMap.get(p.user_id) || null,
      })) as (AssetPermission & { user: { id: string; full_name: string; avatar_url: string | null; email: string | null } | null })[];
    },
  });

  // Verificar se o usuário tem uma role específica
  const hasRole = (roles: AssetPermissionRole[]): boolean => {
    return userPermissions.some((p) => roles.includes(p.role));
  };

  // Verificar permissões específicas
  const canManageInventory = hasRole(['assets_admin', 'inventory_admin', 'inventory_manager']);
  const canManageKeys = hasRole(['assets_admin', 'keys_admin', 'keys_manager']);
  const canManageGifts = hasRole(['assets_admin', 'gifts_admin', 'gifts_manager']);
  const isAssetsAdmin = hasRole(['assets_admin']);
  const isInventoryAdmin = hasRole(['assets_admin', 'inventory_admin']);
  const isKeysAdmin = hasRole(['assets_admin', 'keys_admin']);
  const isGiftsAdmin = hasRole(['assets_admin', 'gifts_admin']);
  const canView = userPermissions.length > 0;

  // Adicionar permissão
  const addPermissionMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AssetPermissionRole }) => {
      const { data, error } = await supabase
        .from("asset_permissions")
        .insert({
          bu_id: buId!,
          user_id: userId,
          role,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-permissions"] });
      toast.success("Permissão adicionada");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Usuário já possui esta permissão");
      } else {
        toast.error("Erro ao adicionar permissão");
      }
    },
  });

  // Remover permissão
  const removePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("asset_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-permissions"] });
      toast.success("Permissão removida");
    },
    onError: () => {
      toast.error("Erro ao remover permissão");
    },
  });

  return {
    userPermissions,
    allPermissions,
    isLoading: isLoadingUserPermissions || isLoadingAllPermissions,
    hasRole,
    canManageInventory,
    canManageKeys,
    canManageGifts,
    isAssetsAdmin,
    isInventoryAdmin,
    isKeysAdmin,
    isGiftsAdmin,
    canView,
    addPermission: addPermissionMutation.mutate,
    removePermission: removePermissionMutation.mutate,
    isAddingPermission: addPermissionMutation.isPending,
    isRemovingPermission: removePermissionMutation.isPending,
    refetchAllPermissions,
  };
}
