import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import type { AssetInventory, AssetMovement, AssetCategory, AssetMovementType } from "../types";

export function useInventory() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buId = currentBu?.id;

  // Buscar categorias
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["asset-categories", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_categories")
        .select("*")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as AssetCategory[];
    },
  });

  // Buscar itens de inventário
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["asset-inventory", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_inventory")
        .select(`
          *,
          category:asset_categories!category_id(id, name)
        `)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Fetch locations and users separately
      const items = data || [];
      const locationIds = [...new Set(items.flatMap(i => [i.home_location_id, i.current_location_id].filter(Boolean)))];
      const userIds = [...new Set(items.map(i => i.current_user_id).filter(Boolean))];

      const [{ data: locations }, { data: profiles }] = await Promise.all([
        locationIds.length > 0 
          ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, first_name, last_name, display_name, photo_url").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const locationMap = new Map((locations || []).map(l => [l.id, l]));
      const profileMap = new Map((profiles || []).map(p => [p.user_id, {
        id: p.user_id,
        full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
        avatar_url: p.photo_url,
      }]));

      return items.map(i => ({
        ...i,
        home_location: i.home_location_id ? locationMap.get(i.home_location_id) || null : null,
        current_location: i.current_location_id ? locationMap.get(i.current_location_id) || null : null,
        current_user: i.current_user_id ? profileMap.get(i.current_user_id) || null : null,
      })) as AssetInventory[];
    },
  });

  // Buscar item específico
  const getItem = async (itemId: string): Promise<AssetInventory | null> => {
    const { data, error } = await supabase
      .from("asset_inventory")
      .select(`
        *,
        category:asset_categories!category_id(id, name)
      `)
      .eq("id", itemId)
      .single();

    if (error) return null;
    return data as AssetInventory;
  };

  // Buscar movimentações de um item
  const getMovements = async (assetId: string): Promise<AssetMovement[]> => {
    const { data, error } = await supabase
      .from("asset_movements")
      .select("*")
      .eq("asset_id", assetId)
      .order("occurred_at", { ascending: false });

    if (error) return [];

    // Fetch related data
    const movements = data || [];
    const locationIds = [...new Set(movements.flatMap(m => [m.from_location_id, m.to_location_id].filter(Boolean)))];
    const userIds = [...new Set(movements.flatMap(m => [m.from_user_id, m.to_user_id, m.authorized_by_user_id, m.performed_by_user_id].filter(Boolean)))];

    const [{ data: locations }, { data: profiles }] = await Promise.all([
      locationIds.length > 0
        ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from("profiles").select("user_id, first_name, last_name, display_name").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const locationMap = new Map((locations || []).map(l => [l.id, l]));
    const profileMap = new Map((profiles || []).map(p => [p.user_id, {
      id: p.user_id,
      full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
    }]));

    return movements.map(m => ({
      ...m,
      from_location: m.from_location_id ? locationMap.get(m.from_location_id) || null : null,
      from_user: m.from_user_id ? profileMap.get(m.from_user_id) || null : null,
      to_location: m.to_location_id ? locationMap.get(m.to_location_id) || null : null,
      to_user: m.to_user_id ? profileMap.get(m.to_user_id) || null : null,
      authorized_by: m.authorized_by_user_id ? profileMap.get(m.authorized_by_user_id) || null : null,
      performed_by: m.performed_by_user_id ? profileMap.get(m.performed_by_user_id) || null : null,
    })) as AssetMovement[];
  };

  // Criar categoria
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; parent_id?: string; description?: string }) => {
      const { data: category, error } = await supabase
        .from("asset_categories")
        .insert({
          bu_id: buId!,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories", buId] });
      toast.success("Categoria criada");
    },
    onError: () => {
      toast.error("Erro ao criar categoria");
    },
  });

  // Criar item
  const createItemMutation = useMutation({
    mutationFn: async (data: { 
      internal_code: string; 
      name: string; 
      category_id?: string;
      description?: string;
      home_location_id?: string;
      acquired_at?: string;
      serial_number?: string;
      brand?: string;
      model?: string;
      notes?: string;
    }) => {
      const { data: item, error } = await supabase
        .from("asset_inventory")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-inventory", buId] });
      toast.success("Item criado");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Código interno já existe");
      } else {
        toast.error("Erro ao criar item");
      }
    },
  });

  // Atualizar item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssetInventory> & { id: string }) => {
      const { data: item, error } = await supabase
        .from("asset_inventory")
        .update({
          ...data,
          updated_by: user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-inventory", buId] });
      toast.success("Item atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar item");
    },
  });

  // Soft delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_inventory")
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-inventory", buId] });
      toast.success("Item removido");
    },
    onError: () => {
      toast.error("Erro ao remover item");
    },
  });

  // Criar movimentação
  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      asset_id: string;
      movement_type: AssetMovementType;
      from_holder_type?: 'location' | 'user';
      from_location_id?: string;
      from_user_id?: string;
      to_holder_type?: 'location' | 'user';
      to_location_id?: string;
      to_user_id?: string;
      authorized_by_user_id?: string;
      due_at?: string;
      notes?: string;
    }) => {
      const { data: movement, error } = await supabase
        .from("asset_movements")
        .insert({
          bu_id: buId!,
          performed_by_user_id: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-inventory", buId] });
      toast.success("Movimentação registrada");
    },
    onError: () => {
      toast.error("Erro ao registrar movimentação");
    },
  });

  return {
    categories,
    items,
    isLoading: isLoadingCategories || isLoadingItems,
    getItem,
    getMovements,
    createCategory: createCategoryMutation.mutate,
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    createMovement: createMovementMutation.mutate,
    isCreatingCategory: createCategoryMutation.isPending,
    isCreatingItem: createItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
    isCreatingMovement: createMovementMutation.isPending,
    refetchItems,
  };
}
