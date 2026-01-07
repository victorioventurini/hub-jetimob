// ============================================================
// URL STATE CONSTANTS - Hub da Jet
// ============================================================

/** Tamanho padrão de página para listagens */
export const DEFAULT_PAGE_SIZE = 25;

/** Tamanho máximo de página permitido */
export const MAX_PAGE_SIZE = 100;

/** Tamanho mínimo de página */
export const MIN_PAGE_SIZE = 1;

/** Direções de ordenação permitidas */
export const ALLOWED_SORT_DIR = ["asc", "desc"] as const;

/** Debounce padrão para busca (ms) */
export const DEFAULT_SEARCH_DEBOUNCE = 300;

/** Parâmetros padrão de URL */
export const URL_PARAM_KEYS = {
  // Busca
  search: "q",
  
  // Paginação
  page: "page",
  pageSize: "pageSize",
  
  // Ordenação
  sort: "sort",
  direction: "dir",
  
  // Filtros comuns
  status: "status",
  tab: "tab",
  
  // Escopo de time
  teamId: "teamId",
  squadId: "squadId",
  
  // Data
  startDate: "start",
  endDate: "end",
  year: "year",
  
  // Contexto
  ownerId: "ownerId",
  categoryId: "categoryId",
} as const;

/** Valores padrão para filtros */
export const DEFAULT_FILTER_VALUES = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  status: "all",
  sortDir: "desc" as const,
} as const;
