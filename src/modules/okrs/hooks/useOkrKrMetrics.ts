import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from 'sonner';
import type { OkrKrMetric, OkrMetricRole } from '../types';

export function useOkrKrMetrics(krId: string, krType: 'org' | 'team') {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-kr-metrics', krId, krType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(`
          *,
          kpi:kpi_metrics(id, name, unit, target_value, direction)
        `)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .is('deleted_at', null);

      if (error) throw error;
      return data as OkrKrMetric[];
    },
    enabled: !!krId,
  });
}

export function usePrimaryKrMetric(krId: string, krType: 'org' | 'team') {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-kr-metrics', 'primary', krId, krType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(`
          *,
          kpi:kpi_metrics(id, name, unit, target_value, direction)
        `)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'primary')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as OkrKrMetric | null;
    },
    enabled: !!krId,
  });
}

export function useGuardrailKrMetrics(krId: string, krType: 'org' | 'team') {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ['okr-kr-metrics', 'guardrails', krId, krType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select(`
          *,
          kpi:kpi_metrics(id, name, unit, target_value, direction)
        `)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'guardrail')
        .is('deleted_at', null);

      if (error) throw error;
      return data as OkrKrMetric[];
    },
    enabled: !!krId,
  });
}

export function useCreateKrMetric() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (metric: {
      kr_id: string;
      kr_type: 'org' | 'team';
      kpi_id: string;
      role: OkrMetricRole;
    }) => {
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['okr-kr-metrics', variables.kr_id, variables.kr_type] });
      queryClient.invalidateQueries({ queryKey: ['okr-kr-metrics', 'primary', variables.kr_id, variables.kr_type] });
      queryClient.invalidateQueries({ queryKey: ['okr-kr-metrics', 'guardrails', variables.kr_id, variables.kr_type] });
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
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: OkrMetricRole }) => {
      const { error } = await supabase
        .from('okr_kr_metrics')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-kr-metrics'] });
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
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('okr_kr_metrics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-kr-metrics'] });
      toast.success('KPI desvinculado');
    },
    onError: () => {
      toast.error('Erro ao desvincular KPI');
    },
  });
}
