/**
 * Assets Query Keys
 */
export const assetsKeys = {
  // Inventory
  inventory: {
    all: (buId: string | null) => ['assets', 'inventory', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) => 
      ['assets', 'inventory', 'list', buId, filters] as const,
    detail: (assetId: string) => ['assets', 'inventory', 'detail', assetId] as const,
    movements: (assetId: string) => ['assets', 'inventory', 'movements', assetId] as const,
    history: (assetId: string) => ['assets', 'inventory', 'history', assetId] as const,
  },
  
  // Groups/Kits
  groups: {
    all: (buId: string | null) => ['assets', 'groups', buId] as const,
    detail: (groupId: string) => ['assets', 'groups', 'detail', groupId] as const,
    items: (groupId: string) => ['assets', 'groups', 'items', groupId] as const,
    byAsset: (assetId: string) => ['assets', 'groups', 'byAsset', assetId] as const,
  },
  
  // Keys
  keys: {
    all: (buId: string | null) => ['asset-keys', buId] as const,
    keyrings: (buId: string | null, filters?: { search?: string }) => 
      ['asset-keyrings', buId, filters] as const,
    clavicularies: (buId: string | null) => ['asset-clavicularies', buId] as const,
    movements: (keyringId: string) => ['assets', 'keys', 'movements', keyringId] as const,
    history: (keyringId: string) => ['assets', 'keys', 'history', keyringId] as const,
  },
  
  // Gifts
  gifts: {
    all: (buId: string | null) => ['assets', 'gifts', buId] as const,
    items: (buId: string | null, filters?: { search?: string }) => 
      ['asset-gift-items', buId, filters] as const,
    batches: (buId: string | null) => ['asset-gift-batches', buId] as const,
    movements: (itemId: string) => ['assets', 'gifts', 'movements', itemId] as const,
  },
  
  // Shared
  categories: (buId: string | null) => ['assets', 'categories', buId] as const,
  locations: (buId: string | null) => ['assets', 'locations', buId] as const,
  locationsOptions: (buId: string | null) => ['assets', 'locations-options', buId] as const,
  permissions: (buId: string | null) => ['assets', 'permissions', buId] as const,
  profilesForPermissions: (buId: string | null) => ['profiles-for-assets-permissions', buId] as const,
  
  // Recommendations
  recommendations: {
    all: (buId: string | null) => ['assets', 'recommendations', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) => 
      ['assets', 'recommendations', 'list', buId, filters] as const,
    detail: (id: string) => ['assets', 'recommendations', 'detail', id] as const,
    best: (params: Record<string, unknown>) => 
      ['assets', 'recommendations', 'best', params] as const,
    lastValue: (id: string | null) => 
      ['assets', 'recommendations', 'lastValue', id] as const,
  },

  // Phone Lines
  phoneLines: {
    all: (buId: string | null) => ['assets', 'phone-lines', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) =>
      ['assets', 'phone-lines', 'list', buId, filters] as const,
    detail: (id: string) => ['assets', 'phone-lines', 'detail', id] as const,
    carriers: (buId: string | null) => ['assets', 'phone-lines', 'carriers', buId] as const,
    history: (id: string) => ['assets', 'phone-lines', 'history', id] as const,
  },
} as const;
