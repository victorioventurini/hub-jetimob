import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetInventory, AssetMovement, AssetCategory, AssetMovementType } from "../types";

export function useInventory() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // Buscar categorias
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: queryKeys.assets.categories(buId ?? null),
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
    queryKey: queryKeys.assets.inventory.all(buId ?? null),
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
      // IMPORTANT: current_user_id stores profiles.id (NOT auth.users.id)
      // See docs/IDENTITY_CONVENTION.md
      const items = data || [];
      const locationIds = [...new Set(items.flatMap(i => [i.home_location_id, i.current_location_id].filter(Boolean)))];
      const profileIds = [...new Set(items.map(i => i.current_user_id).filter(Boolean))];

      const [{ data: locations }, { data: profiles }] = await Promise.all([
        locationIds.length > 0 
          ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
          : Promise.resolve({ data: [] }),
        profileIds.length > 0
          ? supabase.from("profiles").select("id, first_name, last_name, display_name, photo_url").in("id", profileIds)
          : Promise.resolve({ data: [] }),
      ]);

      const locationMap = new Map((locations || []).map(l => [l.id, l]));
      const profileMap = new Map((profiles || []).map(p => [p.id, {
        id: p.id,
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

  // Buscar item específico por ID
  const getItem = async (itemId: string): Promise<AssetInventory | null> => {
    const { data, error } = await supabase
      .from("asset_inventory")
      .select(`
        *,
        category:asset_categories!category_id(id, name)
      `)
      .eq("id", itemId)
      .maybeSingle();

    if (error) {
      console.error("[useInventory] getItem error:", error);
      return null;
    }
    
    if (!data) return null;
    
    // Fetch location and user data
    const locationIds = [data.home_location_id, data.current_location_id].filter(Boolean) as string[];
    const profileIds = [data.current_user_id].filter(Boolean) as string[];

    const [{ data: locations }, { data: profiles }] = await Promise.all([
      locationIds.length > 0 
        ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      profileIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name, display_name, photo_url").in("id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const locationMap = new Map((locations || []).map(l => [l.id, l]));
    const profileMap = new Map((profiles || []).map(p => [p.id, {
      id: p.id,
      full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
      avatar_url: p.photo_url,
    }]));

    return {
      ...data,
      home_location: data.home_location_id ? locationMap.get(data.home_location_id) || null : null,
      current_location: data.current_location_id ? locationMap.get(data.current_location_id) || null : null,
      current_user: data.current_user_id ? profileMap.get(data.current_user_id) || null : null,
    } as AssetInventory;
  };

  // Buscar item específico por código interno
  const getItemByCode = async (internalCode: string): Promise<AssetInventory | null> => {
    if (!buId) return null;
    
    const { data, error } = await supabase
      .from("asset_inventory")
      .select(`
        *,
        category:asset_categories!category_id(id, name)
      `)
      .eq("bu_id", buId)
      .eq("internal_code", internalCode)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;
    
    // Fetch location and user data
    const locationIds = [data.home_location_id, data.current_location_id].filter(Boolean) as string[];
    const profileIds = [data.current_user_id].filter(Boolean) as string[];

    const [{ data: locations }, { data: profiles }] = await Promise.all([
      locationIds.length > 0 
        ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      profileIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name, display_name, photo_url").in("id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const locationMap = new Map((locations || []).map(l => [l.id, l]));
    const profileMap = new Map((profiles || []).map(p => [p.id, {
      id: p.id,
      full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
      avatar_url: p.photo_url,
    }]));

    return {
      ...data,
      home_location: data.home_location_id ? locationMap.get(data.home_location_id) || null : null,
      current_location: data.current_location_id ? locationMap.get(data.current_location_id) || null : null,
      current_user: data.current_user_id ? profileMap.get(data.current_user_id) || null : null,
    } as AssetInventory;
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
    // IMPORTANT: from_user_id, to_user_id, performed_by_user_id, authorized_by_user_id
    // all store profiles.id (NOT auth.users.id). See docs/IDENTITY_CONVENTION.md
    const movements = data || [];
    const locationIds = [...new Set(movements.flatMap(m => [m.from_location_id, m.to_location_id].filter(Boolean)))];
    const profileIds = [...new Set(movements.flatMap(m => [m.from_user_id, m.to_user_id, m.authorized_by_user_id, m.performed_by_user_id].filter(Boolean)))];

    const [{ data: locations }, { data: profiles }] = await Promise.all([
      locationIds.length > 0
        ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      profileIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name, display_name").in("id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const locationMap = new Map((locations || []).map(l => [l.id, l]));
    const profileMap = new Map((profiles || []).map(p => [p.id, {
      id: p.id,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null) });
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
      // Assignment fields
      assigned_to_user_id?: string;
      authorized_by_user_id?: string;
      due_at?: string;
    }) => {
      const { assigned_to_user_id, authorized_by_user_id, due_at, ...itemData } = data;

      // Create the item
      const insertData: any = {
        bu_id: buId!,
        created_by: user?.id,
        ...itemData,
      };

      // If assigning to user, set initial status as loaned
      if (assigned_to_user_id) {
        insertData.status = "loaned";
        insertData.current_holder_type = "user";
        insertData.current_user_id = assigned_to_user_id;
        insertData.current_location_id = null;
        insertData.assigned_at = new Date().toISOString();
      } else {
        // Default: available at home location
        insertData.status = "available";
        insertData.current_holder_type = "location";
        insertData.current_location_id = itemData.home_location_id;
      }

      const { data: item, error } = await supabase.from("asset_inventory").insert(insertData).select().single();

      if (error) throw error;

      // If assigned to user, create checkout movement
      if (assigned_to_user_id && item) {
        await supabase.from("asset_movements").insert({
          bu_id: buId!,
          asset_id: item.id,
          movement_type: "checkout",
          from_holder_type: "location",
          from_location_id: itemData.home_location_id,
          to_holder_type: "user",
          to_user_id: assigned_to_user_id,
          authorized_by_user_id: authorized_by_user_id,
          performed_by_user_id: user?.id,
          due_at: due_at || null,
          notes: "Atribuição inicial no cadastro",
        });
      }

      return { item, assigned_to_user_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null) });
      if (result.assigned_to_user_id) {
        toast.success("Item criado e atribuído ao colaborador");
      } else {
        toast.success("Item criado");
      }
    },
    onError: (error: any) => {
      console.error("Erro ao criar item", error);
      if (error?.code === "23505") {
        toast.error("Código interno já existe");
      } else if (error?.message) {
        toast.error(`Erro ao criar item: ${error.message}`);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null) });
      toast.success("Item atualizado");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar item", error);
      if (error?.message) {
        toast.error(`Erro ao atualizar item: ${error.message}`);
      } else {
        toast.error("Erro ao atualizar item");
      }
    },
  });

  // Soft delete item with optimistic update
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
      return id;
    },
    // Optimistic update: remove from list immediately
    onMutate: async (id) => {
      const queryKey = queryKeys.assets.inventory.all(buId ?? null);
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<AssetInventory[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData.filter((item) => item.id !== id));
      }
      
      return { previousData, queryKey };
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error("Erro ao remover item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null) });
      toast.success("Item removido");
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null) });
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
    getItemByCode,
    getMovements,
    createCategory: createCategoryMutation.mutate,
    createItem: createItemMutation.mutate,
    createItemAsync: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutate,
    updateItemAsync: updateItemMutation.mutateAsync,
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
