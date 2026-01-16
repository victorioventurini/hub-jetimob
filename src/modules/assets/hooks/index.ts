// Assets module hooks barrel export

// Queries
export { useAssetCategoriesQuery, useInventoryListQuery, type UseInventoryFilters } from "./useInventoryQueries";

// Mutations
export { useAssetCategoryMutations, useAssetItemMutations, useAssetMovementMutations } from "./useInventoryMutations";

// Aggregated hook (backward compatibility - prefer using individual hooks)
export { useInventory, type UseInventoryOptions } from "./useInventory";

// Other domain hooks
export { useKeys } from "./useKeys";
export { useGifts } from "./useGifts";
export { useLocations, type BuLocationOption } from "./useLocations";
export { useAssetProfiles } from "./useProfiles";
export { useAssetPermissionsV2 } from "./useAssetPermissionsV2";
export { useAssetGroups } from "./useAssetGroups";
export { useBrands } from "./useBrands";

export { useAuthorizers } from "./useAuthorizers";
export { useBuAdmins } from "./useBuAdmins";
