import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import type { ObjectiveHealthData, OkrInsight } from '../types/health';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook para buscar health score de um objetivo
 */
export function useObjectiveHealth(objectiveType: 'org' | 'team', objectiveId: string | null) {
  const { currentBuId } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.health(currentBuId ?? null, objectiveType, objectiveId),
    queryFn: async () => {
      if (!currentBuId || !objectiveId || !supabase) return null;

      const { data, error } = await supabase.rpc('calculate_objective_health', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
      return data as unknown as ObjectiveHealthData;
    },
    enabled: !!currentBuId && !!objectiveId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para recalcular e persistir health score
 */
export function useRefreshObjectiveHealth() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ objectiveType, objectiveId }: { objectiveType: 'org' | 'team'; objectiveId: string }) => {
      if (!currentBuId) throw new Error('BU não selecionada');
      if (!supabase) throw new Error('Cliente não disponível');

      const { error } = await supabase.rpc('refresh_objective_health', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.health(currentBuId ?? null, variables.objectiveType, variables.objectiveId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectives(currentBuId ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesAll() });
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
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.insights(currentBuId ?? null, scopeType, scopeId),
    queryFn: async () => {
      if (!currentBuId || !scopeId || !supabase) return [];

      const { data, error } = await supabase
        .from('okr_insights')
        .select('id, bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source, created_at, created_by, deleted_at')
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
    enabled: !!currentBuId && !!scopeId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para gerar insights de um objetivo
 */
export function useGenerateObjectiveInsights() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ objectiveType, objectiveId }: { objectiveType: 'org' | 'team'; objectiveId: string }) => {
      if (!currentBuId) throw new Error('BU não selecionada');
      if (!supabase) throw new Error('Cliente não disponível');

      const { data, error } = await supabase.rpc('generate_okr_insights_for_objective', {
        p_bu_id: currentBuId,
        p_objective_type: objectiveType,
        p_objective_id: objectiveId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.insights(currentBuId ?? null, variables.objectiveType + '_objective', variables.objectiveId) });
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
 * Hook para marcar insight como resolvido (soft delete) com optimistic update
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from('okr_insights')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', insightId);

      if (error) throw error;
      return insightId;
    },
    // Optimistic update: remove from list immediately
    onMutate: async (insightId) => {
      const queryKey = queryKeys.okrs.insights(currentBuId ?? null);
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<OkrInsight[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData.filter((i) => i.id !== insightId));
      }
      
      return { previousData, queryKey };
    },
    onError: (_error, _insightId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error('Erro ao resolver insight');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.insights(currentBuId ?? null) });
      toast.success('Insight marcado como resolvido');
    },
  });
}

/**
 * Hook para buscar objetivos em risco (para dashboard)
 */
export function useRiskObjectives(limit = 5) {
  const { currentBuId } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.riskObjectives(currentBuId ?? null, limit),
    queryFn: async () => {
      if (!currentBuId || !supabase) return [];

      const { data, error } = await supabase
        .from('v_objective_health')
        .select('id, objective_type, title, team_id, team_name, health_score, health_status, last_checkin_at, kr_count, kr_at_risk')
        .eq('bu_id', currentBuId)
        .eq('health_status', 'risk')
        .order('health_score', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBuId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar insights ativos do dashboard
 */
export function useDashboardInsights(limit = 10) {
  const { currentBuId } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.dashboardInsights(currentBuId ?? null, limit),
    queryFn: async () => {
      if (!currentBuId || !supabase) return [];

      const { data, error } = await supabase
        .from('okr_insights')
        .select('id, bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source, created_at')
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
    enabled: !!currentBuId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
