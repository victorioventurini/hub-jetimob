import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import { getKpiValueUpdateErrorCopy } from "../utils/kpiValueErrors";

import { KpiScope, KpiIndicatorType, KpiLifecycleStatus, KpiFrequencyValue } from "../types";

interface UpdateKpiData {
  id: string;
  name: string;
  description: string | null;
  /** @deprecated v2.82.0 - Use area_id for ownership */
  category?: string;
  unit: string;
  direction: 'up' | 'down';
  /** @deprecated v3.0.0 — escrito como espelho enquanto a coluna for NOT NULL no DB. */
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  // v3.0.0 frequency split
  consolidation_frequency?: KpiFrequencyValue;
  update_frequency?: KpiFrequencyValue;
  frequency_migration_reviewed?: boolean;
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
  // v2.90.0: operational responsibility
  responsible_area_id?: string | null;
  responsible_team_id?: string | null;
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
        // v2.90.0: operational responsibility
        responsible_area_id: updateData.responsible_area_id || null,
        responsible_team_id: updateData.responsible_team_id || null,
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
      // Invalidate list and evolution queries using prefix helpers
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detailPrefixById(variables.id), refetchType: 'active' });
      // Also invalidate values and target history for complete reactivity
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.valuesPrefix(), refetchType: 'active' });
      
      // CRITICAL: KPI changes may drive KR effective values (primary KPI source of truth)
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krEffectiveValuesPrefix(), refetchType: 'active' });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
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

  // Update KPI value entry
  const updateKpiValue = useMutation({
    mutationFn: async (data: {
      id: string;
      kpi_id: string;
      value: number;
      reference_date: string;
      notes?: string;
      input_type?: 'partial' | 'consolidated';
    }) => {
      const client = assertSupabaseClient(supabase, "updateKpiValue");
      const { id, kpi_id, ...updateData } = data;
      const updatePayload: Record<string, unknown> = {
        value: updateData.value,
        reference_date: updateData.reference_date,
        notes: updateData.notes || null,
      };
      if (updateData.input_type) updatePayload.input_type = updateData.input_type;
      const { data: result, error } = await client
        .from("kpi_values")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!result) {
        // 0 linhas atualizadas → tipicamente RLS (não é o autor do registro
        // ou perdeu permissão). Mensagem clara em vez do críptico
        // "Cannot coerce the result to a single JSON object" do PostgREST.
        throw new Error(
          "Você não tem permissão para editar este valor. Apenas quem registrou o valor (ou um administrador da BU) pode alterá-lo.",
        );
      }
      return { ...result, kpi_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.valuesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detailPrefixById(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.kpiValuesBatchPrefix(), refetchType: 'active' });
      // Invalidate OKR queries for primary KPI reactivity
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krEffectiveValuesPrefix(), refetchType: 'active' });
      toast({ title: "Valor atualizado", description: "O valor foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar valor", description: error.message, variant: "destructive" });
    },
  });

  // Delete KPI value entry
  const deleteKpiValue = useMutation({
    mutationFn: async (data: { id: string; kpi_id: string }) => {
      const client = assertSupabaseClient(supabase, "deleteKpiValue");
      const { error } = await client.from("kpi_values").delete().eq("id", data.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.valuesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detailPrefixById(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.kpiValuesBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krEffectiveValuesPrefix(), refetchType: 'active' });
      toast({ title: "Valor excluído", description: "O valor foi removido com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir valor", description: error.message, variant: "destructive" });
    },
  });

  return {
    updateKpi,
    deleteKpi,
    archiveKpi,
    reactivateKpi,
    updateKpiValue,
    deleteKpiValue,
  };
}
