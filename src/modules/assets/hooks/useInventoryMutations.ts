import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import type { AssetInventory, AssetMovementType } from "../types";

import type { AssetCategory } from "../types";

/**
 * Hook for asset category mutations (create, update, delete)
 */
export function useAssetCategoryMutations() {
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; parent_id?: string; description?: string }) => {
      const client = assertSupabaseClient(supabase, "createCategory");
      const { data: category, error } = await client
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null), refetchType: 'active' });
      toast.success("Categoria criada");
    },
    onError: () => {
      toast.error("Erro ao criar categoria");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      parent_id?: string;
      description?: string;
    }) => {
      const client = assertSupabaseClient(supabase, "updateCategory");
      const { data: category, error } = await client
        .from("asset_categories")
        .update({
          name: data.name,
          parent_id: data.parent_id || null,
          description: data.description || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null), refetchType: 'active' });
      toast.success("Categoria atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar categoria");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = assertSupabaseClient(supabase, "deleteCategory");
      const { error } = await client
        .from("asset_categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    // Optimistic update: remove from list immediately
    onMutate: async (id) => {
      const queryKey = queryKeys.assets.categories(buId ?? null);
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<AssetCategory[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData.filter((c) => c.id !== id));
      }
      
      return { previousData, queryKey };
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error("Erro ao remover categoria");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null), refetchType: 'active' });
      toast.success("Categoria removida");
    },
  });

  return {
    createCategory: createCategoryMutation.mutate,
    createCategoryAsync: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutate,
    updateCategoryAsync: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutate,
    deleteCategoryAsync: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
}

/**
 * Hook for asset inventory item mutations (create, update, delete)
 */
export function useAssetItemMutations() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;

  // Create item mutation
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
      const client = assertSupabaseClient(supabase, "createItem");
      const { assigned_to_user_id, authorized_by_user_id, due_at, ...itemData } = data;

      // Create the item
      const insertData: Record<string, unknown> = {
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

      const { data: item, error } = await client.from("asset_inventory").insert(insertData as any).select().single();

      if (error) throw error;

      // If assigned to user, create checkout movement
      if (assigned_to_user_id && item) {
        await client.from("asset_movements").insert({
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null), refetchType: 'active' });
      if (result.assigned_to_user_id) {
        toast.success("Item criado e atribuído ao colaborador");
      } else {
        toast.success("Item criado");
      }
    },
    onError: (error: { code?: string; message?: string }) => {
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

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssetInventory> & { id: string }) => {
      const client = assertSupabaseClient(supabase, "updateItem");
      
      // Sanitize UUID fields: convert empty strings to null
      const sanitizedData = {
        ...data,
        ...(data.category_id !== undefined && {
          category_id: data.category_id || null,
        }),
        ...(data.home_location_id !== undefined && {
          home_location_id: data.home_location_id || null,
        }),
        ...(data.current_location_id !== undefined && {
          current_location_id: data.current_location_id || null,
        }),
        ...(data.current_user_id !== undefined && {
          current_user_id: data.current_user_id || null,
        }),
        updated_by: user?.id,
      };

      const { data: item, error } = await client
        .from("asset_inventory")
        .update(sanitizedData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null), refetchType: 'active' });
      toast.success("Item atualizado");
    },
    onError: (error: { message?: string }) => {
      console.error("Erro ao atualizar item", error);
      if (error?.message) {
        toast.error(`Erro ao atualizar item: ${error.message}`);
      } else {
        toast.error("Erro ao atualizar item");
      }
    },
  });

  // Delete item mutation (soft delete with optimistic update)
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = assertSupabaseClient(supabase, "deleteItem");
      const { error } = await client
        .from("asset_inventory")
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null), refetchType: 'active' });
      toast.success("Item removido");
    },
  });

  return {
    createItem: createItemMutation.mutate,
    createItemAsync: createItemMutation.mutateAsync,
    isCreatingItem: createItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    updateItemAsync: updateItemMutation.mutateAsync,
    isUpdatingItem: updateItemMutation.isPending,
    deleteItem: deleteItemMutation.mutate,
    isDeletingItem: deleteItemMutation.isPending,
  };
}

/**
 * Hook for asset movement mutations
 */
export function useAssetMovementMutations() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;

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
      const client = assertSupabaseClient(supabase, "createMovement");
      const { data: movement, error } = await client
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(buId ?? null), refetchType: 'active' });
      toast.success("Movimentação registrada");
    },
    onError: () => {
      toast.error("Erro ao registrar movimentação");
    },
  });

  return {
    createMovement: createMovementMutation.mutate,
    createMovementAsync: createMovementMutation.mutateAsync,
    isCreatingMovement: createMovementMutation.isPending,
  };
}
