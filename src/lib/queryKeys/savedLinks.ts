/**
 * Query Keys - Saved Links
 * 
 * Gerencia links salvos por usuário com favoritos por módulo
 */

export const savedLinksKeys = {
  all: ['saved-links'] as const,
  
  /** Lista todos os links de um módulo */
  list: (buId: string, moduleSlug: string) => 
    ['saved-links', 'list', buId, moduleSlug] as const,
  
  /** Busca o link favorito de um módulo */
  favorite: (buId: string, moduleSlug: string) => 
    ['saved-links', 'favorite', buId, moduleSlug] as const,
  
  /** Invalidação de todos os links de uma BU */
  byBu: (buId: string) => 
    ['saved-links', buId] as const,
} as const;
