/**
 * Suppliers Query Keys
 */
export const suppliersKeys = {
  all: (buId: string | null) => ['suppliers', buId] as const,
  list: (buId: string | null, filters?: { search?: string }) => 
    ['suppliers', 'list', buId, filters] as const,
  search: (term: string | null) => 
    ['suppliers', 'search', term] as const,
} as const;
