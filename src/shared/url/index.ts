// ============================================================
// URL STATE - Hub da Jet
// ============================================================
// Padrão centralizado para sincronizar estado com URL
// ============================================================

// Constants
export * from "./constants";

// Types
export type {
  UrlStateValue,
  NavigationMode,
  UrlParamConfig,
  UrlStateSchema,
  UrlStateResult,
  UrlStatesResult,
  UrlStateOptions,
} from "./types";

// Parsers & Serializers
export {
  parsers,
  serializers,
  arrayParams,
  dateRangeParams,
} from "./parsers";

// Schemas pré-configurados
export {
  // Zod schemas
  zodSchemas,
  // Config factories
  searchConfig,
  tabConfig,
  statusConfig,
  sortConfig,
  sortDirConfig,
  yearConfig,
  idConfig,
  booleanConfig,
  sortingSchema,
  searchSchema,
  listingSchema,
  statusFilterSchema,
  teamFilterSchema,
  dateRangeSchema,
  // Utilities
  createNamespacedSchema,
  combineSchemas,
} from "./schemas";

// Hooks
export {
  useUrlState,
  useUrlStates,
  useUrlTab,
  useUrlSearch,
  useUrlArrayParam,
  useUrlDateRange,
} from "./useUrlState";

// ============================================================
// UTILITIES
// ============================================================

/** Gera uma URL com os parâmetros atuais para compartilhamento */
export function buildShareableUrl(baseUrl?: string): string {
  return baseUrl || window.location.href;
}

/** Copia a URL atual para a área de transferência */
export async function copyCurrentUrl(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}

/** Extrai parâmetros de uma URL string */
export function parseUrlParams(url: string): Record<string, string> {
  const params = new URL(url, window.location.origin).searchParams;
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/** Verifica se há filtros ativos (diferentes dos defaults) */
export function hasActiveFilters(
  current: Record<string, any>,
  defaults: Record<string, any>
): boolean {
  for (const key of Object.keys(defaults)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(defaults[key])) {
      return true;
    }
  }
  return false;
}
