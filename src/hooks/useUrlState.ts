import { useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

// ============================================================
// URL STATE UTILITIES - Hub da Jet
// ============================================================
// Padrão centralizado para sincronizar estado com URL
// Todas as páginas devem usar esses utilitários para:
// - Abas e subabas: ?tab=overview&subtab=pending
// - Filtros: ?status=on_track&team_id=123
// - Busca: ?q=texto
// - Paginação: ?page=2&page_size=25
// - Ordenação: ?sort=updated_at&order=desc
// - Multi-select (CSV): ?status=on_track,at_risk
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
// PARSERS - Funções para converter string da URL para tipos
// ============================================================

export const parsers = {
  string: (value: string) => value,
  number: (value: string) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  },
  boolean: (value: string) => value === 'true' || value === '1',
  stringArray: (value: string) => value.split(',').filter(Boolean),
  stringOrUndefined: (value: string) => value || undefined,
};

// ============================================================
// SERIALIZERS - Funções para converter valores para string
// ============================================================

export const serializers = {
  string: (value: string | undefined | null) => value || null,
  number: (value: number | undefined | null) => 
    value !== undefined && value !== null ? String(value) : null,
  boolean: (value: boolean | undefined | null) => 
    value !== undefined && value !== null ? String(value) : null,
  stringArray: (value: string[] | undefined | null) => 
    value && value.length > 0 ? value.join(',') : null,
};

// ============================================================
// HOOK: useUrlState
// ============================================================
// Hook principal para gerenciar um único parâmetro de URL
// 
// Exemplo:
// const [tab, setTab] = useUrlState({ key: 'tab', defaultValue: 'overview' });
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
  const setValue = useCallback((newValue: T) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      
      // Serialize the value
      let serialized: string | null = null;
      if (serialize) {
        serialized = serialize(newValue);
      } else if (Array.isArray(newValue)) {
        serialized = serializers.stringArray(newValue as string[]);
      } else if (typeof newValue === 'number') {
        serialized = serializers.number(newValue);
      } else if (typeof newValue === 'boolean') {
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
    }, { replace: true });
  }, [setSearchParams, key, defaultValue, serialize, skipDefault]);
  
  return [value, setValue];
}

// ============================================================
// HOOK: useUrlStates
// ============================================================
// Hook para gerenciar múltiplos parâmetros de URL de uma vez
// Retorna um objeto com os valores e um setter unificado
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
  const setValues = useCallback((updates: Partial<T>) => {
    setSearchParams(prev => {
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
        } else if (typeof newValue === 'number') {
          serialized = serializers.number(newValue);
        } else if (typeof newValue === 'boolean') {
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
    }, { replace: true });
  }, [setSearchParams, configs]);
  
  // Clear all URL params (reset to defaults)
  const clearAll = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      for (const config of Object.values(configs)) {
        newParams.delete(config.key);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, configs]);
  
  return [values, setValues, clearAll];
}

// ============================================================
// HOOK: useUrlTab
// ============================================================
// Hook simplificado para gerenciar abas
// ============================================================

export function useUrlTab<T extends string = string>(
  defaultTab: T,
  key: string = 'tab'
): [T, (tab: T) => void] {
  return useUrlState<T>({
    key,
    defaultValue: defaultTab,
    parse: (v) => v as T,
    serialize: (v) => v,
  });
}

// ============================================================
// HOOK: useUrlFilters
// ============================================================
// Hook simplificado para gerenciar filtros comuns
// ============================================================

export interface CommonFilters {
  search?: string;
  status?: string;
  teamId?: string;
  year?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

const commonFiltersConfig = {
  search: { key: 'q', defaultValue: '', parse: parsers.string },
  status: { key: 'status', defaultValue: 'all', parse: parsers.string },
  teamId: { key: 'team_id', defaultValue: undefined as string | undefined, parse: parsers.stringOrUndefined },
  year: { key: 'year', defaultValue: new Date().getFullYear(), parse: parsers.number },
  page: { key: 'page', defaultValue: 1, parse: parsers.number },
  pageSize: { key: 'page_size', defaultValue: 25, parse: parsers.number },
  sort: { key: 'sort', defaultValue: '', parse: parsers.string },
  order: { key: 'order', defaultValue: 'desc' as 'asc' | 'desc', parse: (v: string) => v as 'asc' | 'desc' },
};

export function useUrlFilters<T extends Partial<CommonFilters>>(
  overrides?: Partial<typeof commonFiltersConfig>
) {
  const finalConfig = { ...commonFiltersConfig, ...overrides };
  return useUrlStates<T>(finalConfig as any);
}

// ============================================================
// UTILITIES - Funções auxiliares
// ============================================================

/** Gera uma URL com os parâmetros atuais para compartilhamento */
export function buildShareableUrl(baseUrl?: string): string {
  const url = baseUrl || window.location.href;
  return url;
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
