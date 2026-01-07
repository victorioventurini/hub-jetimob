// ============================================================
// BUILD QUERY KEY - Hub da Jet
// ============================================================
// Helper para construir queryKeys consistentes que incluem
// o estado da URL, garantindo invalidação correta do cache
// ============================================================

type QueryKeyParams = Record<string, unknown>;

/**
 * Constrói uma queryKey estável incluindo parâmetros de URL
 * 
 * @example
 * // Lista de tickets com filtros
 * queryKey: buildQueryKey('tickets', 'list', { buId, q, status, page, pageSize })
 * // => ['tickets', 'list', { buId: '...', page: 1, pageSize: 25, q: '', status: 'all' }]
 * 
 * @example
 * // Detalhe de um item
 * queryKey: buildQueryKey('tickets', 'detail', { id })
 * // => ['tickets', 'detail', { id: '...' }]
 */
export function buildQueryKey(
  module: string,
  entity: string,
  params?: QueryKeyParams
): readonly unknown[] {
  if (!params || Object.keys(params).length === 0) {
    return [module, entity] as const;
  }

  // Ordena as chaves para garantir estabilidade
  const sortedParams = sortObjectKeys(params);
  
  return [module, entity, sortedParams] as const;
}

/**
 * Ordena as chaves de um objeto recursivamente para garantir
 * que a mesma combinação de parâmetros gere a mesma queryKey
 */
function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  const sorted = {} as T;
  
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      const value = obj[key];
      
      // Recursivamente ordena objetos aninhados
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        sorted[key as keyof T] = sortObjectKeys(value as Record<string, unknown>) as T[keyof T];
      } else {
        sorted[key as keyof T] = value as T[keyof T];
      }
    });
  
  return sorted;
}

/**
 * Helper para criar queryKey de listagem com filtros de URL
 */
export function buildListQueryKey(
  module: string,
  params: {
    buId?: string | null;
    q?: string;
    status?: string | string[];
    page?: number;
    pageSize?: number;
    sort?: string;
    dir?: string;
    teamId?: string;
    squadId?: string;
    [key: string]: unknown;
  }
): readonly unknown[] {
  // Remove valores undefined/null/vazios para queryKeys mais limpas
  const cleanParams = Object.entries(params).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>
  );

  return buildQueryKey(module, "list", cleanParams);
}

/**
 * Helper para criar queryKey de detalhe
 */
export function buildDetailQueryKey(
  module: string,
  id: string | null | undefined,
  params?: QueryKeyParams
): readonly unknown[] {
  if (!id) {
    return [module, "detail", null] as const;
  }
  
  if (!params || Object.keys(params).length === 0) {
    return [module, "detail", { id }] as const;
  }
  
  return [module, "detail", { id, ...sortObjectKeys(params) }] as const;
}

/**
 * Helper para invalidar todas as queries de um módulo
 */
export function getModuleQueryKey(module: string): readonly [string] {
  return [module] as const;
}

/**
 * Helper para invalidar todas as listagens de um módulo
 */
export function getListQueryKey(module: string): readonly [string, string] {
  return [module, "list"] as const;
}
