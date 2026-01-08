// ============================================================
// URL STATE UTILITIES - Hub da Jet (DEPRECATED)
// ============================================================
// @deprecated Este arquivo foi mantido apenas para compatibilidade.
// NOVOS COMPONENTES DEVEM IMPORTAR DE '@/shared/url'
// 
// A migração foi concluída na Wave 4B.
// Este arquivo será removido em uma versão futura.
// ============================================================

if (import.meta.env.DEV) {
  console.warn(
    '[DEPRECATED] useUrlState from src/hooks/useUrlState.ts is deprecated. ' +
    'Import from @/shared/url instead.'
  );
}

import { useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Re-export new utilities
export {
  buildShareableUrl,
  copyCurrentUrl,
  parseUrlParams,
  hasActiveFilters,
} from "@/shared/url";

// ============================================================
// TYPES (Legacy)
// ============================================================

export type UrlStateValue = string | number | boolean | string[] | null | undefined;

export interface UrlStateConfig<T> {
  /** Chave do parâmetro na URL */
  key: string;
  /** Valor padrão quando não existe na URL */
  defaultValue: T;
  /** Função para converter string da URL para o tipo correto */
  parse?: (value: string) => T;
  /** Função para converter o valor para string na URL */
  serialize?: (value: T) => string | null;
  /** Se true, não inclui na URL quando é o valor padrão */
  skipDefault?: boolean;
}

// ============================================================
// PARSERS
// ============================================================

export const parsers = {
  string: (value: string) => value,
  number: (value: string) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  },
  boolean: (value: string) => value === "true" || value === "1",
  stringArray: (value: string) => value.split(",").filter(Boolean),
  stringOrUndefined: (value: string) => value || undefined,
};

// ============================================================
// SERIALIZERS
// ============================================================

export const serializers = {
  string: (value: string | undefined | null) => value || null,
  number: (value: number | undefined | null) =>
    value !== undefined && value !== null ? String(value) : null,
  boolean: (value: boolean | undefined | null) =>
    value !== undefined && value !== null ? String(value) : null,
  stringArray: (value: string[] | undefined | null) =>
    value && value.length > 0 ? value.join(",") : null,
};

// ============================================================
// HOOK: useUrlState (Legacy Tuple API)
// ============================================================

export function useUrlState<T extends UrlStateValue>(
  config: UrlStateConfig<T>
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const { key, defaultValue, parse, serialize, skipDefault = true } = config;

  // Parse value from URL
  const value = useMemo(() => {
    const urlValue = searchParams.get(key);
    if (urlValue === null) return defaultValue;
    if (parse) return parse(urlValue);
    return urlValue as unknown as T;
  }, [searchParams, key, defaultValue, parse]);

  // Set value in URL
  const setValue = useCallback(
    (newValue: T) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          // Serialize the value
          let serialized: string | null = null;
          if (serialize) {
            serialized = serialize(newValue);
          } else if (Array.isArray(newValue)) {
            serialized = serializers.stringArray(newValue as string[]);
          } else if (typeof newValue === "number") {
            serialized = serializers.number(newValue);
          } else if (typeof newValue === "boolean") {
            serialized = serializers.boolean(newValue);
          } else {
            serialized = serializers.string(newValue as string);
          }

          // Check if should skip (is default value)
          const isDefault = JSON.stringify(newValue) === JSON.stringify(defaultValue);

          if (serialized === null || (skipDefault && isDefault)) {
            newParams.delete(key);
          } else {
            newParams.set(key, serialized);
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams, key, defaultValue, serialize, skipDefault]
  );

  return [value, setValue];
}

// ============================================================
// HOOK: useUrlStates (Legacy Tuple API)
// ============================================================

export interface UrlStatesConfig {
  [key: string]: UrlStateConfig<any>;
}

export function useUrlStates<T extends Record<string, any>>(
  configs: { [K in keyof T]: UrlStateConfig<T[K]> }
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse all values from URL
  const values = useMemo(() => {
    const result = {} as T;
    for (const [stateKey, config] of Object.entries(configs)) {
      const urlValue = searchParams.get(config.key);
      if (urlValue === null) {
        result[stateKey as keyof T] = config.defaultValue;
      } else if (config.parse) {
        result[stateKey as keyof T] = config.parse(urlValue);
      } else {
        result[stateKey as keyof T] = urlValue as T[keyof T];
      }
    }
    return result;
  }, [searchParams, configs]);

  // Set multiple values at once
  const setValues = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          for (const [stateKey, newValue] of Object.entries(updates)) {
            const config = configs[stateKey];
            if (!config) continue;

            // Serialize the value
            let serialized: string | null = null;
            if (config.serialize) {
              serialized = config.serialize(newValue);
            } else if (Array.isArray(newValue)) {
              serialized = serializers.stringArray(newValue);
            } else if (typeof newValue === "number") {
              serialized = serializers.number(newValue);
            } else if (typeof newValue === "boolean") {
              serialized = serializers.boolean(newValue);
            } else {
              serialized = serializers.string(newValue);
            }

            // Check if should skip
            const isDefault = JSON.stringify(newValue) === JSON.stringify(config.defaultValue);
            const skipDefault = config.skipDefault !== false;

            if (serialized === null || (skipDefault && isDefault)) {
              newParams.delete(config.key);
            } else {
              newParams.set(config.key, serialized);
            }
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams, configs]
  );

  // Clear all URL params (reset to defaults)
  const clearAll = useCallback(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        for (const config of Object.values(configs)) {
          newParams.delete(config.key);
        }
        return newParams;
      },
      { replace: true }
    );
  }, [setSearchParams, configs]);

  return [values, setValues, clearAll];
}

// ============================================================
// HOOK: useUrlTab (Legacy Tuple API)
// ============================================================

export function useUrlTab<T extends string = string>(
  defaultTab: T,
  key: string = "tab"
): [T, (tab: T) => void] {
  return useUrlState<T>({
    key,
    defaultValue: defaultTab,
    parse: (v) => v as T,
    serialize: (v) => v,
  });
}

// ============================================================
// HOOK: useUrlFilters (Legacy)
// ============================================================

export interface CommonFilters {
  search?: string;
  status?: string;
  teamId?: string;
  year?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}

const commonFiltersConfig = {
  search: { key: "q", defaultValue: "", parse: parsers.string },
  status: { key: "status", defaultValue: "all", parse: parsers.string },
  teamId: {
    key: "team_id",
    defaultValue: undefined as string | undefined,
    parse: parsers.stringOrUndefined,
  },
  year: { key: "year", defaultValue: new Date().getFullYear(), parse: parsers.number },
  page: { key: "page", defaultValue: 1, parse: parsers.number },
  pageSize: { key: "page_size", defaultValue: 25, parse: parsers.number },
  sort: { key: "sort", defaultValue: "", parse: parsers.string },
  order: {
    key: "order",
    defaultValue: "desc" as "asc" | "desc",
    parse: (v: string) => v as "asc" | "desc",
  },
};

export function useUrlFilters<T extends Partial<CommonFilters>>(
  overrides?: Partial<typeof commonFiltersConfig>
) {
  const finalConfig = { ...commonFiltersConfig, ...overrides };
  return useUrlStates<T>(finalConfig as any);
}
