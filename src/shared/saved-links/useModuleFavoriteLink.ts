/**
 * Hook leve para buscar apenas o link favorito de um módulo
 * Usado pelo sidebar para determinar o href de cada item
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { savedLinksKeys } from '@/lib/queryKeys/savedLinks';
import type { SavedLink } from './types';

interface UseModuleFavoriteLinkOptions {
  moduleSlug: string;
  enabled?: boolean;
}

export function useModuleFavoriteLink({ moduleSlug, enabled = true }: UseModuleFavoriteLinkOptions) {
  const { client, isReady, buId } = useOptionalBuClient();

  const {
    data: favoriteLink,
    isLoading,
    error,
  } = useQuery({
    queryKey: savedLinksKeys.favorite(buId!, moduleSlug),
    queryFn: async () => {
      if (!client) return null;

      const { data, error } = await client
        .from('user_saved_links')
        .select('id, user_id, bu_id, module_slug, label, path, is_favorite, created_at, updated_at')
        .eq('module_slug', moduleSlug)
        .eq('is_favorite', true)
        .maybeSingle();

      if (error) throw error;
      return data as SavedLink | null;
    },
    enabled: enabled && isReady && !!buId,
    staleTime: 5 * 60 * 1000, // 5 minutos - raramente muda
  });

  return {
    favoriteLink,
    isLoading,
    error,
  };
}
