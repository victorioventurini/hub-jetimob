import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import type { 
  AssetGroup, 
  AssetGroupItem, 
  AssetGroupType, 
  AssetGroupStatus,
  AssetGroupItemRole,
  AssetInventory 
} from "../types";

export function useAssetGroups() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // Buscar todos os kits/grupos
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["asset-groups", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_groups")
        .select(`
          *,
          primary_asset:asset_inventory!primary_asset_id(id, name, internal_code, status)
        `)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as AssetGroup[];
    },
  });

  // Buscar grupo específico com itens
  const getGroup = async (groupId: string): Promise<AssetGroup | null> => {
    const { data, error } = await supabase
      .from("asset_groups")
      .select(`
        *,
        primary_asset:asset_inventory!primary_asset_id(id, name, internal_code, status)
      `)
      .eq("id", groupId)
      .single();

    if (error) return null;

    // Buscar itens do grupo
    const { data: items } = await supabase
      .from("asset_group_items")
      .select(`
        *,
        asset:asset_inventory!asset_id(id, name, internal_code, status, current_holder_type, current_user_id, current_location_id)
      `)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("role", { ascending: true });

    return {
      ...data,
      items: items || [],
    } as AssetGroup;
  };

  // Buscar kit pelo asset_id (verificar se asset pertence a algum kit)
  const getGroupByAssetId = async (assetId: string): Promise<AssetGroup | null> => {
    // Buscar item do grupo
    const { data: groupItem, error: itemError } = await supabase
      .from("asset_group_items")
      .select("group_id")
      .eq("asset_id", assetId)
      .is("deleted_at", null)
      .maybeSingle();

    if (itemError || !groupItem) return null;

    return getGroup(groupItem.group_id);
  };

  // Buscar itens de um grupo
  const getGroupItems = async (groupId: string): Promise<AssetGroupItem[]> => {
    const { data, error } = await supabase
      .from("asset_group_items")
      .select(`
        *,
        asset:asset_inventory!asset_id(id, name, internal_code, status, current_holder_type, current_user_id, current_location_id)
      `)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("role", { ascending: true });

    if (error) return [];
    return data as AssetGroupItem[];
  };

  // Buscar acessórios obrigatórios de um kit pelo asset primário
  const getRequiredAccessories = async (primaryAssetId: string): Promise<AssetInventory[]> => {
    const { data, error } = await supabase.rpc("get_kit_required_accessories", {
      p_asset_id: primaryAssetId,
    });

    if (error) {
      console.error("Error fetching required accessories:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.asset_id,
      name: item.asset_name,
      internal_code: item.internal_code,
      status: item.status,
      current_holder_type: item.current_holder_type,
      current_user_id: item.current_user_id,
      current_location_id: item.current_location_id,
    })) as AssetInventory[];
  };

  // Verificar se asset é primário de algum kit
  const checkIfPrimaryOfKit = async (assetId: string): Promise<{ isKit: boolean; group: AssetGroup | null }> => {
    const { data, error } = await supabase
      .from("asset_groups")
      .select(`
        *,
        primary_asset:asset_inventory!primary_asset_id(id, name, internal_code, status)
      `)
      .eq("primary_asset_id", assetId)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return { isKit: false, group: null };
    }

    // Buscar itens do grupo
    const { data: items } = await supabase
      .from("asset_group_items")
      .select(`
        *,
        asset:asset_inventory!asset_id(id, name, internal_code, status, current_holder_type, current_user_id, current_location_id)
      `)
      .eq("group_id", data.id)
      .is("deleted_at", null);

    return {
      isKit: true,
      group: { ...data, items: items || [] } as AssetGroup,
    };
  };

  // Criar grupo/kit
  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      type?: AssetGroupType;
      primary_asset_id?: string;
      notes?: string;
    }) => {
      const { data: group, error } = await supabase
        .from("asset_groups")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          name: data.name,
          type: data.type || "kit",
          primary_asset_id: data.primary_asset_id || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Kit criado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar kit");
    },
  });

  // Atualizar grupo
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssetGroup> & { id: string }) => {
      const { data: group, error } = await supabase
        .from("asset_groups")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Kit atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar kit");
    },
  });

  // Soft delete grupo
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_groups")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Kit removido");
    },
    onError: () => {
      toast.error("Erro ao remover kit");
    },
  });

  // Adicionar item ao grupo
  const addItemToGroupMutation = useMutation({
    mutationFn: async (data: {
      group_id: string;
      asset_id: string;
      role?: AssetGroupItemRole;
      is_required?: boolean;
      quantity?: number;
      notes?: string;
    }) => {
      const { data: item, error } = await supabase
        .from("asset_group_items")
        .insert({
          bu_id: buId!,
          group_id: data.group_id,
          asset_id: data.asset_id,
          role: data.role || "accessory",
          is_required: data.is_required || false,
          quantity: data.quantity || 1,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Item adicionado ao kit");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Este item já pertence a outro kit");
      } else {
        toast.error("Erro ao adicionar item ao kit");
      }
    },
  });

  // Atualizar item do grupo
  const updateGroupItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssetGroupItem> & { id: string }) => {
      const { data: item, error } = await supabase
        .from("asset_group_items")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Item atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar item");
    },
  });

  // Remover item do grupo (soft delete)
  const removeItemFromGroupMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("asset_group_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Item removido do kit");
    },
    onError: () => {
      toast.error("Erro ao remover item");
    },
  });

  // Definir item como primário
  const setPrimaryItemMutation = useMutation({
    mutationFn: async ({ groupId, assetId }: { groupId: string; assetId: string }) => {
      // Atualizar o item para ser primário (trigger vai atualizar o grupo e desmarcar outros)
      const { error: itemError } = await supabase
        .from("asset_group_items")
        .update({ role: "primary", is_required: true })
        .eq("group_id", groupId)
        .eq("asset_id", assetId)
        .is("deleted_at", null);

      if (itemError) throw itemError;

      // Também atualizar diretamente o grupo (redundância de segurança)
      const { error: groupError } = await supabase
        .from("asset_groups")
        .update({ primary_asset_id: assetId })
        .eq("id", groupId);

      if (groupError) throw groupError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups", buId] });
      toast.success("Item definido como primário");
    },
    onError: () => {
      toast.error("Erro ao definir item primário");
    },
  });

  return {
    groups,
    isLoadingGroups,
    getGroup,
    getGroupByAssetId,
    getGroupItems,
    getRequiredAccessories,
    checkIfPrimaryOfKit,
    createGroup: createGroupMutation.mutate,
    createGroupAsync: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
    addItemToGroup: addItemToGroupMutation.mutate,
    addItemToGroupAsync: addItemToGroupMutation.mutateAsync,
    updateGroupItem: updateGroupItemMutation.mutate,
    removeItemFromGroup: removeItemFromGroupMutation.mutate,
    setPrimaryItem: setPrimaryItemMutation.mutate,
    isCreatingGroup: createGroupMutation.isPending,
    isUpdatingGroup: updateGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
    isAddingItem: addItemToGroupMutation.isPending,
    isRemovingItem: removeItemFromGroupMutation.isPending,
  };
}
