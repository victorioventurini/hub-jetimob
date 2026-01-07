import { z } from "zod";
import type { UrlParamConfig } from "./types";
import { parsers, serializers } from "./parsers";

// ============================================================
// URL SCHEMAS REUTILIZÁVEIS - Hub da Jet
// ============================================================
// Schemas pré-configurados para padrões comuns de URL state
// ============================================================

// ============================================================
// ZOD SCHEMAS BASE
// ============================================================

export const zodSchemas = {
  /** String não vazia */
  nonEmptyString: z.string().min(1),
  
  /** Número positivo */
  positiveNumber: z.number().positive(),
  
  /** Número inteiro não negativo */
  nonNegativeInt: z.number().int().nonnegative(),
  
  /** Página (mínimo 1) */
  page: z.number().int().min(1),
  
  /** Page size (1-100) */
  pageSize: z.number().int().min(1).max(100),
  
  /** Direção de ordenação */
  sortDirection: z.enum(["asc", "desc"]),
  
  /** Boolean */
  boolean: z.boolean(),
  
  /** Array de strings */
  stringArray: z.array(z.string()),
  
  /** UUID */
  uuid: z.string().uuid(),
  
  /** Data no formato YYYY-MM-DD */
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  
  /** Ano (4 dígitos) */
  year: z.number().int().min(2000).max(2100),
};

// ============================================================
// CONFIGS PRÉ-DEFINIDAS
// ============================================================

/** Configuração para busca com debounce */
export const searchConfig = (
  key: string = "q",
  debounceMs: number = 300
): UrlParamConfig<string> => ({
  key,
  defaultValue: "",
  parse: parsers.string,
  serialize: serializers.string,
  debounceMs,
});

/** Configuração para tab */
export const tabConfig = <T extends string>(
  defaultTab: T,
  key: string = "tab"
): UrlParamConfig<T> => ({
  key,
  defaultValue: defaultTab,
  parse: (v) => v as T,
  serialize: (v) => v,
});

/** Configuração para status filter */
export const statusConfig = <T extends string>(
  defaultValue: T = "all" as T,
  key: string = "status"
): UrlParamConfig<T> => ({
  key,
  defaultValue,
  parse: (v) => v as T,
  serialize: (v) => v === "all" ? null : v,
});

/** Configuração para page number */
export const pageConfig = (
  defaultValue: number = 1,
  key: string = "page"
): UrlParamConfig<number> => ({
  key,
  defaultValue,
  schema: zodSchemas.page,
  parse: parsers.numberWithDefault(defaultValue),
  serialize: serializers.number,
});

/** Configuração para page size */
export const pageSizeConfig = (
  defaultValue: number = 25,
  key: string = "pageSize"
): UrlParamConfig<number> => ({
  key,
  defaultValue,
  schema: zodSchemas.pageSize,
  parse: parsers.numberInRange(1, 100, defaultValue),
  serialize: serializers.number,
});

/** Configuração para ordenação */
export const sortConfig = (
  defaultSort: string = "",
  key: string = "sort"
): UrlParamConfig<string> => ({
  key,
  defaultValue: defaultSort,
  parse: parsers.string,
  serialize: serializers.string,
});

/** Configuração para direção de ordenação */
export const sortDirConfig = (
  defaultDir: "asc" | "desc" = "desc",
  key: string = "dir"
): UrlParamConfig<"asc" | "desc"> => ({
  key,
  defaultValue: defaultDir,
  parse: parsers.enum(["asc", "desc"] as const, defaultDir),
  serialize: (v) => v,
});

/** Configuração para ano */
export const yearConfig = (
  defaultYear: number = new Date().getFullYear(),
  key: string = "year"
): UrlParamConfig<number> => ({
  key,
  defaultValue: defaultYear,
  schema: zodSchemas.year,
  parse: parsers.numberWithDefault(defaultYear),
  serialize: serializers.number,
});

/** Configuração para ID (UUID ou string) */
export const idConfig = (
  key: string,
  defaultValue: string = ""
): UrlParamConfig<string> => ({
  key,
  defaultValue,
  parse: parsers.string,
  serialize: serializers.string,
});

/** Configuração para boolean */
export const booleanConfig = (
  key: string,
  defaultValue: boolean = false
): UrlParamConfig<boolean> => ({
  key,
  defaultValue,
  parse: parsers.boolean,
  serialize: serializers.boolean,
});

// ============================================================
// SCHEMAS COMPOSTOS (para useUrlStates)
// ============================================================

/** Schema para paginação */
export const paginationSchema = {
  page: pageConfig(),
  pageSize: pageSizeConfig(),
};

/** Schema para ordenação */
export const sortingSchema = {
  sort: sortConfig(),
  dir: sortDirConfig(),
};

/** Schema para busca simples */
export const searchSchema = {
  q: searchConfig(),
};

/** Schema base para listagens (busca + paginação + ordenação) */
export const listingSchema = {
  q: searchConfig(),
  page: pageConfig(),
  pageSize: pageSizeConfig(),
  sort: sortConfig(),
  dir: sortDirConfig(),
};

/** Schema para filtros com status */
export const statusFilterSchema = <T extends string>(
  defaultStatus: T = "all" as T
) => ({
  status: statusConfig(defaultStatus),
});

/** Schema para filtros por time/squad */
export const teamFilterSchema = {
  teamId: idConfig("teamId"),
  squadId: idConfig("squadId"),
};

/** Schema para filtros por período */
export const dateRangeSchema = {
  start: {
    key: "start",
    defaultValue: "",
    parse: parsers.string,
    serialize: serializers.string,
  } as UrlParamConfig<string>,
  end: {
    key: "end",
    defaultValue: "",
    parse: parsers.string,
    serialize: serializers.string,
  } as UrlParamConfig<string>,
};

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

/**
 * Cria schema com namespace para evitar colisões
 * @example createNamespacedSchema('tickets', listingSchema)
 * // Resulta em: tickets.q, tickets.page, tickets.pageSize, etc.
 */
export function createNamespacedSchema<T extends Record<string, UrlParamConfig<any>>>(
  namespace: string,
  schema: T
): T {
  const result = {} as T;
  for (const [key, config] of Object.entries(schema)) {
    result[key as keyof T] = {
      ...config,
      key: `${namespace}.${config.key}`,
    } as T[keyof T];
  }
  return result;
}

/**
 * Combina múltiplos schemas
 * @example combineSchemas(listingSchema, statusFilterSchema('active'), teamFilterSchema)
 */
export function combineSchemas<T extends Record<string, UrlParamConfig<any>>[]>(
  ...schemas: T
): T[number] {
  return Object.assign({}, ...schemas);
}
