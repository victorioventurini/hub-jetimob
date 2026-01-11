/**
 * Aggregated hook for asset inventory operations
 * 
 * This is a convenience wrapper that combines queries and mutations
 * for backward compatibility. For new code, prefer using the
 * individual hooks directly:
 * - useAssetCategoriesQuery()
 * - useInventoryListQuery(filters)
 * - useAssetItemMutations()
 * - useAssetCategoryMutations()
 * - useAssetMovementMutations()
 */

import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import type { AssetInventory, AssetMovement, AssetCategory } from "../types";

import { 
  useAssetCategoriesQuery, 
  useInventoryListQuery, 
  getInventoryItem,
  getInventoryItemByCode,
  getAssetMovements,
  type UseInventoryFilters 
} from "./useInventoryQueries";

import { 
  useAssetCategoryMutations, 
  useAssetItemMutations, 
  useAssetMovementMutations 
} from "./useInventoryMutations";

export type { UseInventoryFilters };

export interface UseInventoryOptions extends UseInventoryFilters {}

export interface PaginatedInventoryResponse {
  items: AssetInventory[];
  categories: AssetCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 25;

/**
 * Combined hook for asset inventory operations
 * Provides queries and mutations in a single hook for convenience
 */
export function useInventory(options: UseInventoryOptions = {}) {
  const { currentBu } = useBu();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useAssetCategoriesQuery();
  
  const { 
    data: inventoryData, 
    isLoading: isLoadingItems, 
    refetch: refetchItems 
  } = useInventoryListQuery(options);

  // Mutations
  const { 
    createCategory, 
    isCreatingCategory 
  } = useAssetCategoryMutations();

  const { 
    createItem, 
    createItemAsync, 
    updateItem, 
    updateItemAsync, 
    deleteItem,
    isCreatingItem, 
    isUpdatingItem, 
    isDeletingItem 
  } = useAssetItemMutations();

  const { 
    createMovement, 
    isCreatingMovement 
  } = useAssetMovementMutations();

  // Computed values
  const items = inventoryData?.items ?? [];
  const total = inventoryData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Imperative functions (wrapped for backward compatibility)
  const getItem = async (itemId: string): Promise<AssetInventory | null> => {
    return getInventoryItem(supabase, itemId);
  };

  const getItemByCode = async (internalCode: string): Promise<AssetInventory | null> => {
    if (!buId) return null;
    return getInventoryItemByCode(supabase, buId, internalCode);
  };

  const getMovements = async (assetId: string): Promise<AssetMovement[]> => {
    return getAssetMovements(supabase, assetId);
  };

  return {
    // Query results
    categories,
    items,
    total,
    totalPages,
    isLoading: isLoadingCategories || isLoadingItems,
    
    // Imperative queries
    getItem,
    getItemByCode,
    getMovements,
    
    // Mutations
    createCategory,
    createItem,
    createItemAsync,
    updateItem,
    updateItemAsync,
    deleteItem,
    createMovement,
    
    // Mutation states
    isCreatingCategory,
    isCreatingItem,
    isUpdatingItem,
    isDeletingItem,
    isCreatingMovement,
    
    // Refetch
    refetchItems,
  };
}

// Re-export individual hooks for direct use
export { 
  useAssetCategoriesQuery, 
  useInventoryListQuery,
  getInventoryItem,
  getInventoryItemByCode,
  getAssetMovements,
} from "./useInventoryQueries";

export { 
  useAssetCategoryMutations, 
  useAssetItemMutations, 
  useAssetMovementMutations 
} from "./useInventoryMutations";
