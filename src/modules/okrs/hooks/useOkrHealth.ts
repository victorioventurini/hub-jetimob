import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from '@/contexts/BuContext';
import type { ObjectiveHealthData, OkrInsight } from '../types/health';
import { toast } from 'sonner';

/**
 * Hook para buscar health score de um objetivo
 */
export function useObjectiveHealth(objectiveType: 'org' | 'team', objectiveId: string | null) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-health', currentBuId, objectiveType, objectiveId],
    queryFn: async () => {
      if (!currentBuId || !objectiveId) return null;

      const { data, error } = await supabase.rpc('calculate_objective_health', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
      return data as unknown as ObjectiveHealthData;
    },
    enabled: !!currentBuId && !!objectiveId,
  });
}

/**
 * Hook para recalcular e persistir health score
 */
export function useRefreshObjectiveHealth() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ objectiveType, objectiveId }: { objectiveType: 'org' | 'team'; objectiveId: string }) => {
      if (!currentBuId) throw new Error('BU não selecionada');

      const { error } = await supabase.rpc('refresh_objective_health', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['okr-health', currentBuId, variables.objectiveType, variables.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['okr-org-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
    },
    onError: () => {
      toast.error('Erro ao recalcular health score');
    },
  });
}

/**
 * Hook para buscar insights de um objetivo
 */
export function useObjectiveInsights(scopeType: string, scopeId: string | null) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-insights', currentBuId, scopeType, scopeId],
    queryFn: async () => {
      if (!currentBuId || !scopeId) return [];

      const { data, error } = await supabase
        .from('okr_insights')
        .select('*')
        .eq('bu_id', currentBuId)
        .eq('scope_type', scopeType)
        .eq('scope_id', scopeId)
        .is('deleted_at', null)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse suggested_actions from JSONB
      return (data || []).map(insight => ({
        ...insight,
        suggested_actions: insight.suggested_actions as unknown as OkrInsight['suggested_actions'],
      })) as OkrInsight[];
    },
    enabled: !!currentBuId && !!scopeId,
  });
}

/**
 * Hook para gerar insights de um objetivo
 */
export function useGenerateObjectiveInsights() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ objectiveType, objectiveId }: { objectiveType: 'org' | 'team'; objectiveId: string }) => {
      if (!currentBuId) throw new Error('BU não selecionada');

      const { data, error } = await supabase.rpc('generate_okr_insights_for_objective', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['okr-insights', currentBuId, variables.objectiveType + '_objective', variables.objectiveId] });
      if (count > 0) {
        toast.info(`${count} insight(s) gerado(s)`);
      }
    },
    onError: () => {
      toast.error('Erro ao gerar insights');
    },
  });
}

/**
 * Hook para marcar insight como resolvido (soft delete)
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('okr_insights')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-insights', currentBuId] });
      toast.success('Insight marcado como resolvido');
    },
    onError: () => {
      toast.error('Erro ao resolver insight');
    },
  });
}

/**
 * Hook para buscar objetivos em risco (para dashboard)
 */
export function useRiskObjectives(limit = 5) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-risk-objectives', currentBuId, limit],
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await supabase
        .from('v_objective_health')
        .select('*')
        .eq('bu_id', currentBuId)
        .eq('health_status', 'risk')
        .order('health_score', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBuId,
  });
}

/**
 * Hook para buscar insights ativos do dashboard
 */
export function useDashboardInsights(limit = 10) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-dashboard-insights', currentBuId, limit],
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await supabase
        .from('okr_insights')
        .select('*')
        .eq('bu_id', currentBuId)
        .is('deleted_at', null)
        .in('severity', ['critical', 'warning'])
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(insight => ({
        ...insight,
        suggested_actions: insight.suggested_actions as unknown as OkrInsight['suggested_actions'],
      })) as OkrInsight[];
    },
    enabled: !!currentBuId,
  });
}
