/**
 * useKpiContributors - CRUD operations for KPI data contributors
 * 
 * v2.83.0: Manages the relationship between contributors and KPIs,
 * separating data entry responsibility from ownership accountability.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { kpisKeys } from '@/lib/queryKeys/okrs';
import type { KpiContributor, KpiContributorRole } from '../types';

// ============================================================
// Types
// ============================================================

export interface UseKpiContributorsOptions {
  kpiId: string;
  enabled?: boolean;
}

export interface AddContributorParams {
  kpiId: string;
  contributorUserId: string;
  role?: KpiContributorRole;
  notes?: string;
}

export interface UpdateContributorParams {
  contributorId: string;
  role?: KpiContributorRole;
  notes?: string;
}

export interface RemoveContributorParams {
  contributorId: string;
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook for managing KPI data contributors
 * 
 * @example
 * const { contributors, addContributor, removeContributor } = useKpiContributors({
 *   kpiId: 'xxx-yyy-zzz'
 * });
 */
export function useKpiContributors(options: UseKpiContributorsOptions) {
  const { kpiId, enabled = true } = options;
  const { client, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  // ============================================================
  // Query: Fetch contributors for a KPI
  // ============================================================
  const {
    data: contributors = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: kpisKeys.contributors(kpiId),
    enabled: isReady && !!kpiId && enabled,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      if (!client || !kpiId) return [];

      const { data, error } = await client
        .from('kpi_data_contributors')
        .select(`
          id,
          kpi_id,
          contributor_user_id,
          role,
          notes,
          created_at,
          created_by,
          bu_id,
          deleted_at,
          contributor:profiles!contributor_user_id(
            id,
            display_name,
            photo_url
          )
        `)
        .eq('kpi_id', kpiId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useKpiContributors] Fetch error:', error);
        throw error;
      }

      return (data ?? []) as unknown as KpiContributor[];
    },
  });

  // ============================================================
  // Mutation: Add contributor
  // ============================================================
  const addContributorMutation = useMutation({
    mutationFn: async (params: AddContributorParams) => {
      if (!client || !buId) throw new Error('Client not ready');

      const { data, error } = await client
        .from('kpi_data_contributors')
        .insert({
          kpi_id: params.kpiId,
          contributor_user_id: params.contributorUserId,
          role: params.role ?? 'data_entry',
          notes: params.notes ?? null,
          bu_id: buId,
        })
        .select()
        .single();

      if (error) {
        console.error('[useKpiContributors] Add error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: kpisKeys.contributors(params.kpiId) });
      // Also invalidate wizard queries that may depend on contributor data
      queryClient.invalidateQueries({ queryKey: kpisKeys.forWizard({}) });
    },
  });

  // ============================================================
  // Mutation: Update contributor
  // ============================================================
  const updateContributorMutation = useMutation({
    mutationFn: async (params: UpdateContributorParams) => {
      if (!client) throw new Error('Client not ready');

      const updateData: Record<string, unknown> = {};
      if (params.role !== undefined) updateData.role = params.role;
      if (params.notes !== undefined) updateData.notes = params.notes;

      const { data, error } = await client
        .from('kpi_data_contributors')
        .update(updateData)
        .eq('id', params.contributorId)
        .select()
        .single();

      if (error) {
        console.error('[useKpiContributors] Update error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpisKeys.contributors(kpiId) });
    },
  });

  // ============================================================
  // Mutation: Remove contributor (soft delete)
  // ============================================================
  const removeContributorMutation = useMutation({
    mutationFn: async (params: RemoveContributorParams) => {
      if (!client) throw new Error('Client not ready');

      const { error } = await client
        .from('kpi_data_contributors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', params.contributorId);

      if (error) {
        console.error('[useKpiContributors] Remove error:', error);
        throw error;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpisKeys.contributors(kpiId) });
      queryClient.invalidateQueries({ queryKey: kpisKeys.forWizard({}) });
    },
  });

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * Check if a user is a contributor to this KPI
   */
  const isContributor = (userId: string): boolean => {
    return contributors.some(c => c.contributor_user_id === userId);
  };

  /**
   * Get contributor role for a specific user
   */
  const getContributorRole = (userId: string): KpiContributorRole | null => {
    const contributor = contributors.find(c => c.contributor_user_id === userId);
    return contributor?.role ?? null;
  };

  return {
    // Data
    contributors,
    isLoading,
    hasError: !!error,
    
    // Mutations
    addContributor: addContributorMutation.mutateAsync,
    updateContributor: updateContributorMutation.mutateAsync,
    removeContributor: removeContributorMutation.mutateAsync,
    
    // Mutation states
    isAddingContributor: addContributorMutation.isPending,
    isUpdatingContributor: updateContributorMutation.isPending,
    isRemovingContributor: removeContributorMutation.isPending,
    
    // Helpers
    isContributor,
    getContributorRole,
    refetch,
  };
}

// ============================================================
// Hook: Check if current user is contributor to any KPIs
// ============================================================

export interface UseUserContributedKpisOptions {
  userId: string;
  teamId?: string;
}

/**
 * Returns list of KPI IDs where the user is a contributor
 */
export function useUserContributedKpis(options: UseUserContributedKpisOptions) {
  const { userId, teamId } = options;
  const { client, isReady } = useOptionalBuClient();

  const { data: contributedKpiIds = [], isLoading } = useQuery({
    queryKey: kpisKeys.userContributions(userId, teamId),
    enabled: isReady && !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!client || !userId) return [];

      // Get all KPIs where user is contributor
      const { data: contributions, error: contribError } = await client
        .from('kpi_data_contributors')
        .select('kpi_id')
        .eq('contributor_user_id', userId)
        .is('deleted_at', null);

      if (contribError || !contributions) {
        console.error('[useUserContributedKpis] Error:', contribError);
        return [];
      }

      const kpiIds = contributions.map(c => c.kpi_id);

      // If teamId provided, filter to team's KPIs only
      if (teamId && kpiIds.length > 0) {
        const { data: teamKpis, error: teamError } = await client
          .from('kpi_metrics')
          .select('id')
          .in('id', kpiIds)
          .eq('team_id', teamId)
          .is('deleted_at', null);

        if (teamError) {
          console.error('[useUserContributedKpis] Team filter error:', teamError);
          return kpiIds; // Fallback to all contributed KPIs
        }

        return (teamKpis ?? []).map(k => k.id);
      }

      return kpiIds;
    },
  });

  return {
    contributedKpiIds,
    isLoading,
    isContributorOf: (kpiId: string) => contributedKpiIds.includes(kpiId),
  };
}
