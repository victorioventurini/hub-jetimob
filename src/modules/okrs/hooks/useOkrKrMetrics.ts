import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import type { OkrKrMetric, OkrMetricRole } from '../types';

// Explicit fields for okr_kr_metrics - avoid select('*')
const KR_METRIC_FIELDS = `
  id, kr_id, kr_type, kpi_id, role, created_at, deleted_at,
  kpi:kpi_metrics(id, name, unit, target_value, direction)
` as const;

export function useOkrKrMetrics(krId: string, krType: 'org' | 'team') {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.krMetrics(krId, krType),
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(KR_METRIC_FIELDS)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .is('deleted_at', null);

      if (error) throw error;
      return data as OkrKrMetric[];
    },
    enabled: !!krId && isReady && !!supabase,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function usePrimaryKrMetric(krId: string, krType: 'org' | 'team') {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.krMetricsRole('primary', krId, krType),
    queryFn: async () => {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(KR_METRIC_FIELDS)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'primary')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as OkrKrMetric | null;
    },
    enabled: !!krId && isReady && !!supabase,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useGuardrailKrMetrics(krId: string, krType: 'org' | 'team') {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.krMetricsRole('guardrails', krId, krType),
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(KR_METRIC_FIELDS)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'guardrail')
        .is('deleted_at', null);

      if (error) throw error;
      return data as OkrKrMetric[];
    },
    enabled: !!krId && isReady && !!supabase,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useCreateKrMetric() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (metric: {
      kr_id: string;
      kr_type: 'org' | 'team';
      kpi_id: string;
      role: OkrMetricRole;
    }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .insert(metric)
        .select(KR_METRIC_FIELDS)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krMetrics(variables.kr_id, variables.kr_type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krMetricsRole('primary', variables.kr_id, variables.kr_type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krMetricsRole('guardrails', variables.kr_id, variables.kr_type) });
      toast.success(variables.role === 'primary' ? 'KPI primário vinculado' : 'Guardrail adicionado');
    },
    onError: (error: Error) => {
      console.error('Error creating KR metric:', error);
      if (error.message.includes('primary')) {
        toast.error('Este KR já possui um KPI primário');
      } else {
        toast.error('Erro ao vincular KPI');
      }
    },
  });
}

export function useUpdateKrMetric() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: OkrMetricRole }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from('okr_kr_metrics')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate all KR metrics queries for this specific KR
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krMetrics(variables.id, 'org') });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krMetrics(variables.id, 'team') });
      toast.success('KPI atualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating KR metric:', error);
      if (error.message.includes('primary')) {
        toast.error('Este KR já possui um KPI primário');
      } else {
        toast.error('Erro ao atualizar KPI');
      }
    },
  });
}

export function useDeleteKrMetric() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from('okr_kr_metrics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // Invalidate broad pattern - we don't have context of which KR this was
      // The queryKey pattern will match all krMetrics queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && query.queryKey[0] === 'okr-kr-metrics'
      });
      toast.success('KPI desvinculado');
    },
    onError: () => {
      toast.error('Erro ao desvincular KPI');
    },
  });
}
