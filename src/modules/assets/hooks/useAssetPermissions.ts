import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetPermission, AssetPermissionRole } from "../types";

export function useAssetPermissions() {
  const { user } = useAuth();
  const { currentBu, userRole, isLoading: isBuLoading } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // Super admin ou admin de BU tem acesso total
  const isSuperAdmin = userRole === "super_admin";
  const isBuAdmin = userRole === "admin";
  const hasFullAccess = isSuperAdmin || isBuAdmin;

  // Buscar permissões do usuário atual
  // Only fetch if not loading BU context and user doesn't have full access
  const { data: userPermissions = [], isLoading: isLoadingUserPermissions } = useQuery({
    queryKey: [...queryKeys.assets.permissions(buId ?? null), 'user', user?.id, hasFullAccess],
    enabled: !!user?.id && !!buId && !isBuLoading && !hasFullAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_permissions")
        .select("id, bu_id, user_id, role, created_at, created_by, updated_at")
        .eq("bu_id", buId!)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data as AssetPermission[];
    },
  });

  // Buscar todas as permissões da BU (para admins)
  const { data: allPermissions = [], isLoading: isLoadingAllPermissions, refetch: refetchAllPermissions } = useQuery({
    queryKey: [...queryKeys.assets.permissions(buId ?? null), 'all'],
    enabled: !!buId,
    queryFn: async () => {
      const { data: permissions, error } = await supabase
        .from("asset_permissions")
        .select("id, bu_id, user_id, role, created_at")
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
    if (hasFullAccess) return true;
    return userPermissions.some((p) => roles.includes(p.role));
  };

  // Verificar permissões específicas - super_admin e admin de BU têm acesso total
  const canManageInventory = hasFullAccess || hasRole(['assets_admin', 'inventory_admin', 'inventory_manager']);
  const canManageKeys = hasFullAccess || hasRole(['assets_admin', 'keys_admin', 'keys_manager']);
  const canManageGifts = hasFullAccess || hasRole(['assets_admin', 'gifts_admin', 'gifts_manager']);
  const isAssetsAdmin = hasFullAccess || hasRole(['assets_admin']);
  const isInventoryAdmin = hasFullAccess || hasRole(['assets_admin', 'inventory_admin']);
  const isKeysAdmin = hasFullAccess || hasRole(['assets_admin', 'keys_admin']);
  const isGiftsAdmin = hasFullAccess || hasRole(['assets_admin', 'gifts_admin']);
  const canView = hasFullAccess || userPermissions.length > 0;

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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.permissions(buId ?? null) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.permissions(buId ?? null) });
      toast.success("Permissão removida");
    },
    onError: () => {
      toast.error("Erro ao remover permissão");
    },
  });

  return {
    userPermissions,
    allPermissions,
    isLoading: isBuLoading || isLoadingUserPermissions || isLoadingAllPermissions,
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
