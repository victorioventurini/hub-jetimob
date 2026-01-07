import { useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  UrlParamConfig,
  UrlStateResult,
  UrlStatesResult,
  UrlStateSchema,
  UrlStateOptions,
  NavigationMode,
} from "./types";
import { serializers, arrayParams } from "./parsers";

// ============================================================
// HOOK: useUrlState - Parâmetro único
// ============================================================

/**
 * Hook para gerenciar um único parâmetro de URL
 * 
 * @example
 * const { value, set, reset, isActive } = useUrlState({
 *   key: 'status',
 *   defaultValue: 'all',
 * });
 */
export function useUrlState<T>(
  config: UrlParamConfig<T>,
  options: UrlStateOptions = {}
): UrlStateResult<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { key, defaultValue, parse, serialize, skipDefault = true, debounceMs } = config;
  const { navigationMode = "replace", namespace } = options;

  // Chave final (com namespace se fornecido)
  const finalKey = namespace ? `${namespace}.${key}` : key;

  // Parse value from URL
  const value = useMemo(() => {
    const urlValue = searchParams.get(finalKey);
    if (urlValue === null) return defaultValue;

    try {
      if (parse) return parse(urlValue);
      return urlValue as unknown as T;
    } catch {
      return defaultValue;
    }
  }, [searchParams, finalKey, defaultValue, parse]);

  // Verifica se valor está ativo (diferente do padrão)
  const isActive = useMemo(() => {
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  }, [value, defaultValue]);

  // Função interna para atualizar URL
  const updateUrl = useCallback(
    (newValue: T, mode: NavigationMode) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          // Serializa o valor
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

          // Verifica se deve pular (é valor padrão)
          const isDefault = JSON.stringify(newValue) === JSON.stringify(defaultValue);

          if (serialized === null || (skipDefault && isDefault)) {
            newParams.delete(finalKey);
          } else {
            newParams.set(finalKey, serialized);
          }

          return newParams;
        },
        { replace: mode === "replace" }
      );
    },
    [setSearchParams, finalKey, defaultValue, serialize, skipDefault]
  );

  // Set com debounce
  const set = useCallback(
    (newValue: T) => {
      if (debounceMs && debounceMs > 0) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          updateUrl(newValue, navigationMode);
        }, debounceMs);
      } else {
        updateUrl(newValue, navigationMode);
      }
    },
    [debounceMs, updateUrl, navigationMode]
  );

  // Set imediato (ignora debounce)
  const setImmediate = useCallback(
    (newValue: T) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      updateUrl(newValue, navigationMode);
    },
    [updateUrl, navigationMode]
  );

  // Reset para valor padrão
  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    updateUrl(defaultValue, navigationMode);
  }, [updateUrl, defaultValue, navigationMode]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { value, set, setImmediate, reset, isActive };
}

// ============================================================
// HOOK: useUrlStates - Múltiplos parâmetros
// ============================================================

/**
 * Hook para gerenciar múltiplos parâmetros de URL
 * 
 * @example
 * const { values, set, reset, hasActiveFilters } = useUrlStates({
 *   q: searchConfig(),
 *   status: statusConfig('all'),
 *   page: pageConfig(),
 * });
 */
export function useUrlStates<T extends Record<string, any>>(
  schema: UrlStateSchema<T>,
  options: UrlStateOptions = {}
): UrlStatesResult<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { navigationMode = "replace", namespace } = options;

  // Função para obter chave final
  const getFinalKey = useCallback(
    (key: string) => (namespace ? `${namespace}.${key}` : key),
    [namespace]
  );

  // Parse todos os valores da URL
  const values = useMemo(() => {
    const result = {} as T;
    for (const [stateKey, config] of Object.entries(schema)) {
      const finalKey = getFinalKey(config.key);
      const urlValue = searchParams.get(finalKey);

      if (urlValue === null) {
        result[stateKey as keyof T] = config.defaultValue;
      } else {
        try {
          result[stateKey as keyof T] = config.parse
            ? config.parse(urlValue)
            : (urlValue as T[keyof T]);
        } catch {
          result[stateKey as keyof T] = config.defaultValue;
        }
      }
    }
    return result;
  }, [searchParams, schema, getFinalKey]);

  // Calcula filtros ativos
  const activeKeys = useMemo(() => {
    const active: (keyof T)[] = [];
    for (const [stateKey, config] of Object.entries(schema)) {
      const currentValue = values[stateKey as keyof T];
      if (JSON.stringify(currentValue) !== JSON.stringify(config.defaultValue)) {
        active.push(stateKey as keyof T);
      }
    }
    return active;
  }, [values, schema]);

  const hasActiveFilters = activeKeys.length > 0;

  // Atualiza um ou mais valores
  const set = useCallback(
    (updates: Partial<T>, mode: NavigationMode = navigationMode) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          for (const [stateKey, newValue] of Object.entries(updates)) {
            const config = schema[stateKey];
            if (!config) continue;

            const finalKey = getFinalKey(config.key);

            // Serializa o valor
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

            // Verifica se deve pular
            const isDefault = JSON.stringify(newValue) === JSON.stringify(config.defaultValue);
            const skipDefault = config.skipDefault !== false;

            if (serialized === null || (skipDefault && isDefault)) {
              newParams.delete(finalKey);
            } else {
              newParams.set(finalKey, serialized);
            }
          }

          return newParams;
        },
        { replace: mode === "replace" }
      );
    },
    [setSearchParams, schema, getFinalKey, navigationMode]
  );

  // Reset chaves específicas ou todas
  const reset = useCallback(
    (keys?: (keyof T)[]) => {
      const keysToReset = keys || (Object.keys(schema) as (keyof T)[]);
      const updates = {} as Partial<T>;
      for (const key of keysToReset) {
        updates[key] = schema[key].defaultValue;
      }
      set(updates);
    },
    [schema, set]
  );

  // Reset tudo
  const resetAll = useCallback(() => {
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debounceRefs.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return { values, set, reset, resetAll, hasActiveFilters, activeKeys };
}

// ============================================================
// HOOK: useUrlTab - Atalho para tabs
// ============================================================

/**
 * Hook simplificado para gerenciar abas via URL
 * 
 * @example
 * const [tab, setTab] = useUrlTab('overview');
 */
export function useUrlTab<T extends string = string>(
  defaultTab: T,
  key: string = "tab"
): [T, (tab: T) => void] {
  const result = useUrlState<T>({
    key,
    defaultValue: defaultTab,
    parse: (v) => v as T,
    serialize: (v) => v,
  });

  return [result.value, result.set];
}

// ============================================================
// HOOK: useUrlSearch - Atalho para busca com debounce
// ============================================================

/**
 * Hook simplificado para busca com debounce
 * 
 * @example
 * const { value, set, reset } = useUrlSearch();
 */
export function useUrlSearch(
  key: string = "q",
  debounceMs: number = 300
): UrlStateResult<string> {
  return useUrlState<string>({
    key,
    defaultValue: "",
    debounceMs,
  });
}

// ============================================================
// HOOK: useUrlArrayParam - Arrays com repeated params
// ============================================================

/**
 * Hook para arrays usando repeated params (?status=a&status=b)
 * 
 * @example
 * const { value, set, toggle } = useUrlArrayParam('status');
 */
export function useUrlArrayParam(
  key: string,
  defaultValue: string[] = []
): {
  value: string[];
  set: (values: string[]) => void;
  toggle: (value: string) => void;
  add: (value: string) => void;
  remove: (value: string) => void;
  reset: () => void;
  isActive: boolean;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    return arrayParams.parseRepeated(searchParams, key);
  }, [searchParams, key]);

  const isActive = value.length > 0 || defaultValue.length > 0;

  const updateParams = useCallback(
    (newValues: string[]) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          arrayParams.serializeRepeated(newParams, key, newValues);
          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams, key]
  );

  const set = useCallback(
    (values: string[]) => updateParams(values),
    [updateParams]
  );

  const toggle = useCallback(
    (val: string) => {
      const newValues = value.includes(val)
        ? value.filter((v) => v !== val)
        : [...value, val];
      updateParams(newValues);
    },
    [value, updateParams]
  );

  const add = useCallback(
    (val: string) => {
      if (!value.includes(val)) {
        updateParams([...value, val]);
      }
    },
    [value, updateParams]
  );

  const remove = useCallback(
    (val: string) => {
      updateParams(value.filter((v) => v !== val));
    },
    [value, updateParams]
  );

  const reset = useCallback(() => {
    updateParams(defaultValue);
  }, [updateParams, defaultValue]);

  return { value, set, toggle, add, remove, reset, isActive };
}

// ============================================================
// HOOK: useUrlDateRange - Date ranges
// ============================================================

/**
 * Hook para gerenciar date range na URL
 * 
 * @example
 * const { start, end, set, reset } = useUrlDateRange();
 */
export function useUrlDateRange(
  startKey: string = "start",
  endKey: string = "end"
): {
  start: string;
  end: string;
  set: (range: { start?: string; end?: string }) => void;
  reset: () => void;
  isActive: boolean;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const start = searchParams.get(startKey) || "";
  const end = searchParams.get(endKey) || "";

  const isActive = !!(start || end);

  const set = useCallback(
    (range: { start?: string; end?: string }) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          if (range.start !== undefined) {
            if (range.start) {
              newParams.set(startKey, range.start);
            } else {
              newParams.delete(startKey);
            }
          }

          if (range.end !== undefined) {
            if (range.end) {
              newParams.set(endKey, range.end);
            } else {
              newParams.delete(endKey);
            }
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams, startKey, endKey]
  );

  const reset = useCallback(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete(startKey);
        newParams.delete(endKey);
        return newParams;
      },
      { replace: true }
    );
  }, [setSearchParams, startKey, endKey]);

  return { start, end, set, reset, isActive };
}
