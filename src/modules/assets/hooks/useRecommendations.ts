/**
 * useRecommendations Hook
 * 
 * Query and mutation hooks for Equipment Recommendations.
 * @see TCR v2.93.0 - Módulo Assets Recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { enrichRecommendation } from '../lib/recommendationUtils';
import type { AssetRecommendation, RecommendationStatus, RecommendationReviewStatus } from '../types';

// ============================================
// TYPES
// ============================================

export interface RecommendationFilters {
  search?: string;
  categoryId?: string;
  teamId?: string;
  jobTitleId?: string;
  status?: RecommendationStatus;
  reviewStatus?: RecommendationReviewStatus;
}

export interface CreateRecommendationInput {
  name: string;
  category_id?: string;
  brand: string;
  model?: string;
  description?: string;
  applicable_team_ids?: string[];
  applicable_job_title_ids?: string[];
  review_interval_months?: number;
  owner_user_id: string;
  notes?: string;
}

export interface UpdateRecommendationInput extends Partial<CreateRecommendationInput> {
  id: string;
  status?: RecommendationStatus;
}

// ============================================
// MAIN HOOK
// ============================================

export function useRecommendations(filters?: RecommendationFilters) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profileId } = useIdentity();
  const queryClient = useQueryClient();
  const buId = currentBuId;

  // ============================================
  // QUERY: List recommendations
  // ============================================
  const {
    data: recommendations = [],
    isLoading: isQueryLoading,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.assets.recommendations.list(buId ?? null, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      if (!buId) return [];

      // First, fetch teams and job titles maps for name resolution
      const [teamsResult, jobTitlesResult] = await Promise.all([
        supabase.from('teams').select('id, name').eq('bu_id', buId).is('deleted_at', null),
        supabase.from('job_titles').select('id, name').is('deleted_at', null).contains('bu_ids', [buId]),
      ]);
      
      const teamsMap = new Map<string, string>();
      (teamsResult.data || []).forEach(t => teamsMap.set(t.id, t.name));
      
      const jobTitlesMap = new Map<string, string>();
      (jobTitlesResult.data || []).forEach(jt => jobTitlesMap.set(jt.id, jt.name));

      let query = supabase
        .from('asset_recommendations')
        .select(`
          id, bu_id, name, brand, model, description,
          category_id,
          applicable_team_ids, applicable_job_title_ids,
          review_interval_months, last_reviewed_at,
          owner_user_id, created_by_user_id,
          status, notes, created_at, updated_at,
          category:asset_categories!category_id(
            id, name,
            parent:asset_categories!parent_id(name)
          ),
          owner:profiles!owner_user_id(id, display_name, photo_url)
        `)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('name');

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        // Default: only active
        query = query.eq('status', 'active');
      }

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
      }

      // Team/JobTitle filters use array contains
      if (filters?.teamId) {
        query = query.contains('applicable_team_ids', [filters.teamId]);
      }

      if (filters?.jobTitleId) {
        query = query.contains('applicable_job_title_ids', [filters.jobTitleId]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with computed fields and resolved names
      return (data || []).map((rec) => {
        const enriched = enrichRecommendation(rec as unknown as AssetRecommendation);
        
        // Format category with parent name
        if (rec.category?.parent?.name) {
          enriched.category = {
            id: rec.category.id,
            name: rec.category.name,
            parent_name: rec.category.parent.name,
          };
        }
        
        // Resolve team names from IDs
        enriched.applicable_team_names = (rec.applicable_team_ids || [])
          .map((id: string) => teamsMap.get(id))
          .filter((name): name is string => !!name);
        
        // Resolve job title names from IDs
        enriched.applicable_job_title_names = (rec.applicable_job_title_ids || [])
          .map((id: string) => jobTitlesMap.get(id))
          .filter((name): name is string => !!name);
        
        return enriched;
      });
    },
    enabled: !!buId,
  });

  // ============================================
  // MUTATION: Create recommendation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (input: CreateRecommendationInput) => {
      if (!buId || !profileId) throw new Error('BU ou usuário não identificado');

      const { data, error } = await supabase
        .from('asset_recommendations')
        .insert({
          bu_id: buId,
          name: input.name.trim(),
          category_id: input.category_id || null,
          brand: input.brand.trim(),
          model: input.model?.trim() || null,
          description: input.description?.trim() || null,
          applicable_team_ids: input.applicable_team_ids || [],
          applicable_job_title_ids: input.applicable_job_title_ids || [],
          review_interval_months: input.review_interval_months || 6,
          last_reviewed_at: new Date().toISOString(), // Marca como revisada ao criar
          owner_user_id: input.owner_user_id,
          created_by_user_id: profileId,
          notes: input.notes?.trim() || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.recommendations.all(buId ?? null) });
      toast.success('Recomendação criada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar recomendação:', error);
      toast.error('Erro ao criar recomendação');
    },
  });

  // ============================================
  // MUTATION: Update recommendation
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateRecommendationInput) => {
      const { id, ...updates } = input;

      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.category_id !== undefined) payload.category_id = updates.category_id || null;
      if (updates.brand !== undefined) payload.brand = updates.brand.trim();
      if (updates.model !== undefined) payload.model = updates.model?.trim() || null;
      if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
      if (updates.applicable_team_ids !== undefined) payload.applicable_team_ids = updates.applicable_team_ids;
      if (updates.applicable_job_title_ids !== undefined) payload.applicable_job_title_ids = updates.applicable_job_title_ids;
      if (updates.review_interval_months !== undefined) payload.review_interval_months = updates.review_interval_months;
      if (updates.owner_user_id !== undefined) payload.owner_user_id = updates.owner_user_id;
      if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;
      if (updates.status !== undefined) payload.status = updates.status;

      const { error } = await supabase
        .from('asset_recommendations')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.recommendations.all(buId ?? null) });
      toast.success('Recomendação atualizada');
    },
    onError: (error) => {
      console.error('Erro ao atualizar recomendação:', error);
      toast.error('Erro ao atualizar recomendação');
    },
  });

  // ============================================
  // MUTATION: Mark as reviewed
  // ============================================
  const markReviewedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_recommendations')
        .update({ last_reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.recommendations.all(buId ?? null) });
      toast.success('Recomendação marcada como revisada');
    },
    onError: (error) => {
      console.error('Erro ao marcar como revisada:', error);
      toast.error('Erro ao marcar como revisada');
    },
  });

  // ============================================
  // MUTATION: Soft delete (archive)
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_recommendations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.recommendations.all(buId ?? null) });
      toast.success('Recomendação excluída');
    },
    onError: (error) => {
      console.error('Erro ao excluir recomendação:', error);
      toast.error('Erro ao excluir recomendação');
    },
  });

  // isLoading only when buId exists and query is actually loading
  // isPending is true when query is disabled (no buId yet)
  const isLoading = !!buId && (isQueryLoading || isPending);

  return {
    // Data
    recommendations,
    isLoading,
    error,
    refetch,

    // Mutations
    createRecommendation: createMutation.mutate,
    createRecommendationAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateRecommendation: updateMutation.mutate,
    updateRecommendationAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    markAsReviewed: markReviewedMutation.mutate,
    isMarkingReviewed: markReviewedMutation.isPending,

    deleteRecommendation: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// HOOK: Get last purchase value for a recommendation
// ============================================

export function useLastPurchaseValue(recommendationId: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.assets.recommendations.lastValue(recommendationId),
    queryFn: async () => {
      if (!recommendationId) return null;

      const { data, error } = await supabase
        .from('asset_inventory')
        .select('acquisition_value, acquired_at')
        .eq('recommendation_id', recommendationId)
        .is('deleted_at', null)
        .not('acquisition_value', 'is', null)
        .order('acquired_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data
        ? { value: data.acquisition_value as number, date: data.acquired_at as string }
        : null;
    },
    enabled: !!recommendationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// HOOK: Get single recommendation detail
// ============================================

export function useRecommendationDetail(id: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.assets.recommendations.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('asset_recommendations')
        .select(`
          id, bu_id, name, brand, model, description,
          category_id,
          applicable_team_ids, applicable_job_title_ids,
          review_interval_months, last_reviewed_at,
          owner_user_id, created_by_user_id,
          status, notes, created_at, updated_at,
          category:asset_categories!category_id(
            id, name,
            parent:asset_categories!parent_id(name)
          ),
          owner:profiles!owner_user_id(id, display_name, photo_url),
          created_by:profiles!created_by_user_id(id, display_name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      return enrichRecommendation(data as unknown as AssetRecommendation);
    },
    enabled: !!id,
  });
}
