/**
 * Partners Query Keys
 * 
 * Keys for global partner management (not BU-scoped)
 */
export const partnersKeys = {
  /** All partners (global) */
  all: () => ['partners'] as const,
  
  /** List of partners with optional filters */
  list: (filters?: Record<string, unknown>) => ['partners', 'list', filters] as const,
  
  /** Single partner detail */
  detail: (partnerId: string | null) => ['partners', 'detail', partnerId] as const,
  
  /** Search partner by document (CPF/CNPJ) */
  byDocument: (document: string | null) => ['partners', 'by-document', document] as const,
  
  /** Partner BU associations */
  buAssociations: (partnerId: string | null) => ['partners', 'bu-associations', partnerId] as const,
  
  /** Partners available in a specific BU */
  byBu: (buId: string | null) => ['partners', 'by-bu', buId] as const,
  
  /** Partner service mappings (global, not BU-scoped) */
  services: (partnerId: string | null) => ['partners', 'services', partnerId] as const,
  
  /** Effective services by BU (via view) */
  servicesByBu: (buId: string | null, partnerId?: string) => 
    ['partners', 'services-by-bu', buId, partnerId] as const,
} as const;
