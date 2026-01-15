/**
 * Hook para gerenciar links salvos de um módulo
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { useProfileId } from '@/hooks/useIdentity';
import { savedLinksKeys } from '@/lib/queryKeys/savedLinks';
import { toast } from 'sonner';
import type { SavedLink, CreateSavedLinkInput, UpdateSavedLinkInput } from './types';

interface UseSavedLinksOptions {
  moduleSlug: string;
}

export function useSavedLinks({ moduleSlug }: UseSavedLinksOptions) {
  const client = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const profileId = useProfileId();
  const queryClient = useQueryClient();

  

  // Query: Lista todos os links do módulo
  const {
    data: savedLinks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: savedLinksKeys.list(currentBuId!, moduleSlug),
    queryFn: async () => {
      const { data, error } = await client
        .from('user_saved_links')
        .select('id, user_id, bu_id, module_slug, label, path, is_favorite, created_at, updated_at')
        .eq('module_slug', moduleSlug)
        .order('is_favorite', { ascending: false })
        .order('label', { ascending: true });

      if (error) throw error;
      return data as SavedLink[];
    },
    enabled: !!currentBuId && !!profileId,
  });

  // Derived: Link favorito
  const favoriteLink = savedLinks.find((link) => link.is_favorite) || null;

  // Mutation: Criar link
  const createMutation = useMutation({
    mutationFn: async (input: CreateSavedLinkInput) => {
      if (!profileId || !currentBuId) throw new Error('Missing user or BU context');

      const { data, error } = await client
        .from('user_saved_links')
        .insert({
          user_id: profileId,
          bu_id: currentBuId,
          module_slug: moduleSlug,
          label: input.label,
          path: input.path,
          is_favorite: input.is_favorite ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.list(currentBuId!, moduleSlug) });
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.favorite(currentBuId!, moduleSlug) });
      toast.success('Link salvo com sucesso');
    },
    onError: (error) => {
      console.error('Error creating saved link:', error);
      toast.error('Erro ao salvar link');
    },
  });

  // Mutation: Atualizar link
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateSavedLinkInput & { id: string }) => {
      const { data, error } = await client
        .from('user_saved_links')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.list(currentBuId!, moduleSlug) });
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.favorite(currentBuId!, moduleSlug) });
      toast.success('Link atualizado');
    },
    onError: (error) => {
      console.error('Error updating saved link:', error);
      toast.error('Erro ao atualizar link');
    },
  });

  // Mutation: Deletar link
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('user_saved_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.list(currentBuId!, moduleSlug) });
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.favorite(currentBuId!, moduleSlug) });
      toast.success('Link removido');
    },
    onError: (error) => {
      console.error('Error deleting saved link:', error);
      toast.error('Erro ao remover link');
    },
  });

  // Mutation: Definir como favorito
  const setFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client
        .from('user_saved_links')
        .update({ is_favorite: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.list(currentBuId!, moduleSlug) });
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.favorite(currentBuId!, moduleSlug) });
      toast.success('Link definido como favorito');
    },
    onError: (error) => {
      console.error('Error setting favorite:', error);
      toast.error('Erro ao definir favorito');
    },
  });

  // Mutation: Remover favorito
  const clearFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client
        .from('user_saved_links')
        .update({ is_favorite: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.list(currentBuId!, moduleSlug) });
      queryClient.invalidateQueries({ queryKey: savedLinksKeys.favorite(currentBuId!, moduleSlug) });
      toast.success('Favorito removido');
    },
    onError: (error) => {
      console.error('Error clearing favorite:', error);
      toast.error('Erro ao remover favorito');
    },
  });

  return {
    // Data
    savedLinks,
    favoriteLink,
    isLoading,
    error,

    // Actions
    createLink: createMutation.mutateAsync,
    updateLink: updateMutation.mutateAsync,
    deleteLink: deleteMutation.mutateAsync,
    setFavorite: setFavoriteMutation.mutateAsync,
    clearFavorite: clearFavoriteMutation.mutateAsync,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
