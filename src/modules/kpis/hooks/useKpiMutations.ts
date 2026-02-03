import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import { KpiScope, KpiIndicatorType, KpiLifecycleStatus } from "../types";

interface UpdateKpiData {
  id: string;
  name: string;
  description: string | null;
  /** @deprecated v2.82.0 - Use area_id for ownership */
  category?: string;
  unit: string;
  direction: 'up' | 'down';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  team_id: string | null;
  owner_user_id: string | null;
  target_value: number | null;
  // v2.1 fields
  indicator_type?: KpiIndicatorType;
  lifecycle_status?: KpiLifecycleStatus;
  target_source?: string | null;
  recovery_protocol?: string | null;
  // v2.2 governance fields
  area_id?: string | null;
  scope?: KpiScope;
}

/**
 * Hook de mutations para KPIs (Update, Delete, Archive)
 * Separado do useKpiData para melhor organização e reusabilidade
 */
export function useKpiMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();

  // Update KPI
  const updateKpi = useMutation({
    mutationFn: async (data: UpdateKpiData) => {
      const client = assertSupabaseClient(supabase, "updateKpi");

      const { id, category, ...updateData } = data;
      
      // Sanitize UUID fields: convert empty strings to null
      // v2.82.0: category is deprecated, only include if provided for backwards compatibility
      const sanitizedData = {
        ...updateData,
        ...(category && { category: category as 'financeiro' | 'growth' | 'cs' | 'produto' | 'operacoes' | 'pessoas' }),
        team_id: updateData.team_id || null,
        owner_user_id: updateData.owner_user_id || null,
        area_id: updateData.area_id || null,
        // v2.1 fields
        indicator_type: updateData.indicator_type,
        lifecycle_status: updateData.lifecycle_status,
        target_source: updateData.target_source || null,
        recovery_protocol: updateData.recovery_protocol || null,
        // v2.2 governance
        scope: updateData.scope,
      };

      const { data: result, error } = await client
        .from("kpi_metrics")
        .update(sanitizedData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detail(variables.id), refetchType: 'active' });
      toast({
        title: "KPI atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Soft delete KPI (set deleted_at)
  const deleteKpi = useMutation({
    mutationFn: async (kpiId: string) => {
      const client = assertSupabaseClient(supabase, "deleteKpi");

      const { error } = await client
        .from("kpi_metrics")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", kpiId);

      if (error) throw error;
      return kpiId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      toast({
        title: "KPI removido",
        description: "O KPI foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Archive/Deactivate KPI
  const archiveKpi = useMutation({
    mutationFn: async (kpiId: string) => {
      const client = assertSupabaseClient(supabase, "archiveKpi");

      const { error } = await client
        .from("kpi_metrics")
        .update({ status: 'inactive' })
        .eq("id", kpiId);

      if (error) throw error;
      return kpiId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      toast({
        title: "KPI arquivado",
        description: "O KPI foi desativado e não aparecerá mais no dashboard.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao arquivar KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reactivate KPI
  const reactivateKpi = useMutation({
    mutationFn: async (kpiId: string) => {
      const client = assertSupabaseClient(supabase, "reactivateKpi");

      const { error } = await client
        .from("kpi_metrics")
        .update({ status: 'active' })
        .eq("id", kpiId);

      if (error) throw error;
      return kpiId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      toast({
        title: "KPI reativado",
        description: "O KPI está ativo novamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reativar KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateKpi,
    deleteKpi,
    archiveKpi,
    reactivateKpi,
  };
}
