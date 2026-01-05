import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import type { AssetCategory } from "../types";

export function useCategories() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buId = currentBu?.id;

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["asset-categories", buId] });
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
      queryClient.invalidateQueries({ queryKey: ["asset-categories", buId] });
    },
  });

  // Soft delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories", buId] });
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
