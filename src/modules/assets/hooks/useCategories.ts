import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetCategory } from "../types";

export function useCategories() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.assets.categories(buId ?? null),
    enabled: !!buId,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change rarely
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_categories")
        .select("id, bu_id, name, parent_id, description, status, created_at, updated_at, deleted_at")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as AssetCategory[];
    },
  });

  // Create category
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      parent_id?: string;
      description?: string;
    }) => {
      const { data: category, error } = await supabase
        .from("asset_categories")
        .insert({
          bu_id: buId!,
          name: data.name,
          parent_id: data.parent_id || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null), refetchType: 'active' });
    },
  });

  // Update category
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      parent_id?: string;
      description?: string;
    }) => {
      const { data: category, error } = await supabase
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
    },
  });

  // Soft delete category with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(buId ?? null), refetchType: 'active' });
    },
  });

  return {
    categories,
    isLoading,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
