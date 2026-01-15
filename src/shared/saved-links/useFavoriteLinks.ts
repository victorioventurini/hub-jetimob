/**
 * Hook para buscar links favoritos de múltiplos módulos
 * Usado pelo sidebar para determinar o href de cada item
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { savedLinksKeys } from '@/lib/queryKeys/savedLinks';
import type { SavedLink } from './types';

interface UseFavoriteLinksResult {
  /** Map de moduleSlug -> path do link favorito */
  favoriteLinks: Map<string, string>;
  isLoading: boolean;
  /** Retorna o path favorito ou fallback para a rota padrão */
  getFavoriteHref: (moduleSlug: string, defaultHref: string) => string;
}

/**
 * Hook que busca todos os links favoritos do usuário na BU atual.
 * Otimizado para o sidebar - uma única query ao invés de várias.
 */
export function useFavoriteLinks(): UseFavoriteLinksResult {
  const { client, isReady, buId } = useOptionalBuClient();

  const { data: favoriteLinks, isLoading } = useQuery({
    queryKey: [...savedLinksKeys.all, 'favorites', buId],
    queryFn: async () => {
      if (!client) return new Map<string, string>();

      const { data, error } = await client
        .from('user_saved_links')
        .select('module_slug, path')
        .eq('is_favorite', true);

      if (error) {
        console.error('[useFavoriteLinks] Error:', error);
        return new Map<string, string>();
      }

      // Converte para Map para lookup O(1)
      const linksMap = new Map<string, string>();
      (data || []).forEach((link: { module_slug: string; path: string }) => {
        linksMap.set(link.module_slug, link.path);
      });

      return linksMap;
    },
    enabled: isReady && !!buId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const getFavoriteHref = (moduleSlug: string, defaultHref: string): string => {
    if (!favoriteLinks) return defaultHref;
    return favoriteLinks.get(moduleSlug) || defaultHref;
  };

  return {
    favoriteLinks: favoriteLinks || new Map(),
    isLoading,
    getFavoriteHref,
  };
}
