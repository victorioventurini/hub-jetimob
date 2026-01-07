import { z } from "zod";

// ============================================================
// URL STATE TYPES - Hub da Jet
// ============================================================

/** Valores que podem ser armazenados em URL */
export type UrlStateValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | null 
  | undefined;

/** Opções de navegação ao atualizar URL */
export type NavigationMode = "replace" | "push";

/** Configuração de um parâmetro de URL */
export interface UrlParamConfig<T> {
  /** Chave do parâmetro na URL */
  key: string;
  /** Valor padrão quando não existe na URL */
  defaultValue: T;
  /** Schema Zod para validação (opcional) */
  schema?: z.ZodType<T>;
  /** Função para converter string da URL para o tipo correto */
  parse?: (value: string) => T;
  /** Função para converter o valor para string na URL */
  serialize?: (value: T) => string | null;
  /** Se true, não inclui na URL quando é o valor padrão (default: true) */
  skipDefault?: boolean;
  /** Tempo de debounce em ms (útil para search) */
  debounceMs?: number;
}

/** Configuração para múltiplos parâmetros */
export type UrlStateSchema<T extends Record<string, any>> = {
  [K in keyof T]: UrlParamConfig<T[K]>;
};

/** Resultado do hook useUrlState */
export interface UrlStateResult<T> {
  /** Valor atual (parseado e validado) */
  value: T;
  /** Atualiza o valor (com debounce se configurado) */
  set: (value: T) => void;
  /** Atualiza imediatamente (ignora debounce) */
  setImmediate: (value: T) => void;
  /** Reseta para o valor padrão */
  reset: () => void;
  /** Indica se o valor atual é diferente do padrão */
  isActive: boolean;
}

/** Resultado do hook useUrlStates para múltiplos params */
export interface UrlStatesResult<T extends Record<string, any>> {
  /** Valores atuais (parseados e validados) */
  values: T;
  /** Atualiza um ou mais valores */
  set: (updates: Partial<T>, mode?: NavigationMode) => void;
  /** Reseta todos ou chaves específicas para defaults */
  reset: (keys?: (keyof T)[]) => void;
  /** Reseta todos os valores */
  resetAll: () => void;
  /** Indica se há algum filtro ativo (diferente do padrão) */
  hasActiveFilters: boolean;
  /** Lista de chaves com filtros ativos */
  activeKeys: (keyof T)[];
}

/** Opções adicionais para os hooks */
export interface UrlStateOptions {
  /** Modo de navegação padrão (default: 'replace') */
  navigationMode?: NavigationMode;
  /** Namespace para evitar colisões (ex: 'tickets.') */
  namespace?: string;
}
