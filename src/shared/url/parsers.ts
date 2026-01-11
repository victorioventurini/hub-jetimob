// ============================================================
// URL PARSERS & SERIALIZERS - Hub da Jet
// ============================================================

import { format, parseISO, isValid } from "date-fns";

/**
 * Parsers para converter strings da URL para tipos específicos
 */
export const parsers = {
  /** Retorna string como está */
  string: (value: string): string => value,

  /** Retorna string ou undefined se vazia */
  stringOrUndefined: (value: string): string | undefined => 
    value.trim() || undefined,

  /** Converte para número inteiro */
  number: (value: string): number => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  },

  /** Converte para número com fallback customizado */
  numberWithDefault: (defaultValue: number) => (value: string): number => {
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  },

  /** Converte para número float */
  float: (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  },

  /** Converte para boolean */
  boolean: (value: string): boolean => 
    value === "true" || value === "1" || value === "yes",

  /** Converte para array de strings (formato: value1,value2,value3) */
  stringArray: (value: string): string[] => 
    value.split(",").map(v => v.trim()).filter(Boolean),

  /** Converte para Date */
  date: (value: string): Date | null => {
    try {
      const date = parseISO(value);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  },

  /** Converte para enum (com validação) */
  enum: <T extends string>(allowedValues: readonly T[], defaultValue: T) => 
    (value: string): T => {
      return allowedValues.includes(value as T) ? (value as T) : defaultValue;
    },

  /** Converte para número limitado a um range */
  numberInRange: (min: number, max: number, defaultValue: number) =>
    (value: string): number => {
      const num = parseInt(value, 10);
      if (isNaN(num)) return defaultValue;
      return Math.min(Math.max(num, min), max);
    },
};

/**
 * Serializers para converter valores para strings da URL
 */
export const serializers = {
  /** Serializa string (retorna null se vazia) */
  string: (value: string | undefined | null): string | null =>
    value?.trim() || null,

  /** Serializa número */
  number: (value: number | undefined | null): string | null =>
    value !== undefined && value !== null ? String(value) : null,

  /** Serializa boolean */
  boolean: (value: boolean | undefined | null): string | null =>
    value !== undefined && value !== null ? String(value) : null,

  /** Serializa array para CSV */
  stringArray: (value: string[] | undefined | null): string | null =>
    value && value.length > 0 ? value.join(",") : null,

  /** Serializa Date para YYYY-MM-DD */
  date: (value: Date | undefined | null): string | null =>
    value && isValid(value) ? format(value, "yyyy-MM-dd") : null,

  /** Serializa Date para ISO string completo */
  dateTime: (value: Date | undefined | null): string | null =>
    value && isValid(value) ? value.toISOString() : null,
};

/**
 * Funções para trabalhar com arrays usando repeated params
 * (padrão recomendado: ?status=open&status=paused)
 */
export const arrayParams = {
  /** Parse array de repeated params */
  parseRepeated: (searchParams: URLSearchParams, key: string): string[] => {
    return searchParams.getAll(key).filter(Boolean);
  },

  /** Serializa array para repeated params */
  serializeRepeated: (
    params: URLSearchParams, 
    key: string, 
    values: string[] | null | undefined
  ): void => {
    // Remove todos os valores existentes
    params.delete(key);
    // Adiciona cada valor
    if (values && values.length > 0) {
      values.forEach(v => {
        if (v.trim()) {
          params.append(key, v.trim());
        }
      });
    }
  },
};

/**
 * Helpers para date ranges
 */
export const dateRangeParams = {
  /** Parse date range de URL */
  parse: (
    searchParams: URLSearchParams,
    startKey: string = "start",
    endKey: string = "end"
  ): { start: Date | null; end: Date | null } => {
    const startStr = searchParams.get(startKey);
    const endStr = searchParams.get(endKey);
    return {
      start: startStr ? parsers.date(startStr) : null,
      end: endStr ? parsers.date(endStr) : null,
    };
  },

  /** Serializa date range para URL */
  serialize: (
    params: URLSearchParams,
    range: { start?: Date | null; end?: Date | null },
    startKey: string = "start",
    endKey: string = "end"
  ): void => {
    const startStr = serializers.date(range.start);
    const endStr = serializers.date(range.end);

    if (startStr) {
      params.set(startKey, startStr);
    } else {
      params.delete(startKey);
    }

    if (endStr) {
      params.set(endKey, endStr);
    } else {
      params.delete(endKey);
    }
  },
};
