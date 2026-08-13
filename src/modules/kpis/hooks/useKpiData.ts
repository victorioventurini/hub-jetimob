import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { KpiWithValues, KpiValue, KpiValueSource, KpiScope, KpiIndicatorType, KpiLifecycleStatus, calculateRagStatus } from "../types";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import { getKpiValueCreateErrorCopy } from "../utils/kpiValueErrors";

import {
  valueFrequencyToLegacy,
  isKpiUpdateOverdue,
  getMissingConsolidationPeriods,
} from "../utils/frequency";

// Helper to normalize source types
function mapSource(source: string): KpiValueSource {
  if (source === 'integration') return 'api';
  if (source === 'calculation') return 'database';
  return source as KpiValueSource;
}

// v2.82.0: category deprecated - using areaId for filtering
// v2.83.0: Added indicatorType filter
interface UseKpiDataOptions {
  /** @deprecated v2.82.0 - Use areaId instead */
  category?: string;
  teamId?: string;
  ownerId?: string;
  areaId?: string;
  scope?: KpiScope;
  indicatorType?: KpiIndicatorType;
}

// Types that match the database schema
interface DbKpiMetric {
  id: string;
  name: string;
  description: string | null;
  /** @deprecated v2.82.0 - Use area_id for ownership */
  category?: string;
  bu_id: string | null;
  owner_user_id: string | null;
  team_id: string | null;
  unit: string;
  direction: 'up' | 'down';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  /** v3.0.0 — split de frequência (consolidação × atualização). */
  consolidation_frequency?: import('../types').KpiFrequencyValue | null;
  update_frequency?: import('../types').KpiFrequencyValue | null;
  update_mode?: import('../types').KpiUpdateMode;
  frequency_migration_reviewed?: boolean;
  target_value: number | null;
  status: 'active' | 'inactive';
  is_global: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // v2.1 fields
  indicator_type: string;
  lifecycle_status: string;
  target_source: string | null;
  recovery_protocol: string | null;
  // v2.2 governance fields
  area_id: string | null;
  scope: KpiScope;
  // v2.90.0: operational responsibility
  responsible_area_id: string | null;
  responsible_team_id: string | null;
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
  area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  responsible_team?: {
    id: string;
    name: string;
  } | null;
  responsible_area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface DbKpiValue {
  id: string;
  kpi_id: string;
  value: number;
  reference_date: string;
  source: 'manual' | 'integration' | 'calculation' | 'api' | 'webhook' | 'spreadsheet' | 'database';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // v2.1 fields
  period_start: string | null;
  period_end: string | null;
  period_label: string | null;
  rag_status: string | null;
  /** v3.0.0 — tipo do input. */
  input_type?: import('../types').KpiInputType;
}

export function useKpiData(options: UseKpiDataOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  // v2.82.0: category deprecated - using areaId for filtering
  // v2.83.0: Added indicatorType filter
  const { teamId, ownerId, areaId, scope, indicatorType } = options;

  // Fetch all KPIs with their latest values
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.list(currentBuId, { teamId, ownerId, areaId, scope, indicatorType }),
    enabled: !!supabase && !!currentBuId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!supabase) return [];
      let query = supabase
        .from("kpi_metrics")
        .select(`
          id, name, description, category, bu_id, owner_user_id, team_id,
          unit, direction, frequency,
          consolidation_frequency, update_frequency, update_mode, frequency_migration_reviewed,
          target_value, status, is_global,
          created_at, updated_at, deleted_at,
          indicator_type, lifecycle_status, target_source, recovery_protocol,
          area_id, scope, responsible_area_id, responsible_team_id,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          responsible_team:teams!kpi_metrics_responsible_team_id_fkey(id, name),
          responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color)
        `)
        .eq("status", "active")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("area_id", { nullsFirst: false })
        .order("name");

      // v2.82.0: category filter removed - use areaId instead
      // v2.90.0: filtro de time inclui responsible_team_id (KPIs Globais/Área cuja
      // operação está delegada ao time) — alinhado a useCanEditKpi.
      if (teamId) {
        query = query.or(`team_id.eq.${teamId},responsible_team_id.eq.${teamId}`);
      }
      if (ownerId) {
        query = query.eq("owner_user_id", ownerId);
      }
      // v3.33.0: filtro de área inclui responsible_area_id (KPIs Globais cuja
      // responsabilidade operacional pertence à área).
      if (areaId) {
        query = query.or(`area_id.eq.${areaId},responsible_area_id.eq.${areaId}`);
      }
      if (scope) {
        query = query.eq("scope", scope);
      }
      if (indicatorType) {
        query = query.eq("indicator_type", indicatorType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DbKpiMetric[];
    },
  });

  // Fetch values for all KPIs
  const { data: allValues } = useQuery({
    queryKey: queryKeys.settings.kpiValuesBatch(kpis?.map((k) => k.id)),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!kpis || kpis.length === 0 || !supabase) return [];

      const { data, error } = await supabase
        .from("kpi_values")
        .select(`
          id, kpi_id, value, reference_date, source, notes, created_by, created_at,
          period_start, period_end, period_label, rag_status, input_type
        `)
        .in(
          "kpi_id",
          kpis.map((k) => k.id)
        )
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as DbKpiValue[];
    },
    enabled: !!supabase && !!kpis && kpis.length > 0,
  });

  // Combine KPIs with their values and calculate metrics
  const kpisWithValues: KpiWithValues[] = (kpis || []).map((kpi) => {
    const values = (allValues || [])
      .filter((v) => v.kpi_id === kpi.id)
      .sort(
        (a, b) =>
          new Date(b.reference_date).getTime() -
          new Date(a.reference_date).getTime()
      );

    const currentValue = values[0]?.value ?? null;
    const previousValue = values[1]?.value ?? null;
    const lastValue = values[0];

    let variation: number | null = null;
    let trend: "up" | "down" | "stable" = "stable";

    if (currentValue !== null && previousValue !== null && previousValue !== 0) {
      variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      if (variation > 0.5) trend = "up";
      else if (variation < -0.5) trend = "down";
    }

    // Map DB values to our extended type
    const mappedValues: KpiValue[] = values.map(v => ({
      ...v,
      source: mapSource(v.source),
      rag_status: v.rag_status as KpiValue['rag_status'],
    }));

    // v3.x — flags derivadas de "precisa de atualização" (SSOT em utils/frequency)
    const updateOverdue = isKpiUpdateOverdue(
      kpi.update_frequency ?? null,
      lastValue?.reference_date ?? null,
    );
    const consolidatedLabels = mappedValues
      .filter((v) => v.input_type === 'consolidated' && !!v.period_label)
      .map((v) => v.period_label as string);
    const missingPeriods = getMissingConsolidationPeriods(
      kpi.consolidation_frequency ?? null,
      consolidatedLabels,
      { kpiCreatedAt: new Date(kpi.created_at) },
    );
    const consolidationPending = missingPeriods.length > 0;

    return {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      // v2.82.0: category deprecated - type assertion for compatibility
      category: kpi.category as any,
      bu_id: kpi.bu_id || '',
      owner_user_id: kpi.owner_user_id,
      team_id: kpi.team_id,
      unit: kpi.unit,
      direction: kpi.direction,
      frequency: valueFrequencyToLegacy(kpi.consolidation_frequency ?? null),
      target_value: kpi.target_value,
      status: kpi.status,
      source_type: 'manual' as const,
      source_config: null,
      visibility: 'bu' as const,
      comparison_rule: kpi.direction === 'up' ? 'higher_is_better' as const : 'lower_is_better' as const,
      linked_okrs: [],
      created_at: kpi.created_at,
      updated_at: kpi.updated_at,
      deleted_at: kpi.deleted_at,
      // v2.1 fields
      indicator_type: (kpi.indicator_type || 'kpi') as KpiIndicatorType,
      lifecycle_status: (kpi.lifecycle_status || 'active') as KpiLifecycleStatus,
      target_source: kpi.target_source,
      recovery_protocol: kpi.recovery_protocol,
      // v2.2 governance fields
      area_id: kpi.area_id,
      scope: kpi.scope || 'team',
      // v2.90.0: operational responsibility
      responsible_area_id: kpi.responsible_area_id ?? null,
      responsible_team_id: kpi.responsible_team_id ?? null,
      // v3.0.0 frequency split (necessário para flags derivadas no consumidor)
      consolidation_frequency: kpi.consolidation_frequency ?? null,
      update_frequency: kpi.update_frequency ?? null,
      owner: kpi.owner,
      team: kpi.team ?? null,
      area: kpi.area ?? null,
      responsible_team: kpi.responsible_team ?? null,
      responsible_area: kpi.responsible_area ?? null,
      // v3.33.0 — SSOT para exibição (estrutural com fallback para operacional).
      effective_area: kpi.area ?? kpi.responsible_area ?? null,
      effective_team: kpi.team ?? kpi.responsible_team ?? null,
      values: mappedValues,
      current_value: currentValue,
      previous_value: previousValue,
      variation,
      trend,
      rag_status: calculateRagStatus(currentValue, kpi.target_value, kpi.direction),
      // Campos de auditoria
      last_updated_at: lastValue?.created_at ?? null,
      last_update_source: lastValue ? mapSource(lastValue.source) : null,
      last_updated_by: lastValue?.created_by ?? null,
      last_updated_by_user: null,
      // v3.x — flags de "precisa de atualização"
      needs_update: updateOverdue || consolidationPending,
      update_overdue: updateOverdue,
      consolidation_pending: consolidationPending,
      missing_consolidation_count: missingPeriods.length,
    };
  });

  // Create KPI (uses database schema with v2.1 + v2.2 fields)
  // v2.82.0: category removed from required fields
  const createKpi = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string | null;
      unit: string;
      direction: 'up' | 'down';
      /** @deprecated v3.0.0 — espelho de consolidation_frequency. */
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      // v3.0.0 frequency split
      consolidation_frequency?: import('../types').KpiFrequencyValue;
      update_frequency?: import('../types').KpiFrequencyValue;
      frequency_migration_reviewed?: boolean;
      team_id: string | null;
      owner_user_id: string | null;
      target_value: number | null;
      status: 'active' | 'inactive';
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
    }) => {
      const client = assertSupabaseClient(supabase, "createKpi");

      // Sanitize UUID fields: convert empty strings to null
      const sanitizedData = {
        ...data,
        team_id: data.team_id || null,
        owner_user_id: data.owner_user_id || null,
        // v2.1 fields with defaults
        indicator_type: data.indicator_type || 'kpi',
        lifecycle_status: data.lifecycle_status || 'active',
        target_source: data.target_source || null,
        recovery_protocol: data.recovery_protocol || null,
        // v2.2 governance fields
        area_id: data.area_id || null,
        scope: data.scope || 'team',
        // v2.90.0: operational responsibility
        responsible_area_id: data.responsible_area_id || null,
        responsible_team_id: data.responsible_team_id || null,
      };

      const { data: result, error } = await client
        .from("kpi_metrics")
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      toast({
        title: "KPI criado",
        description: "O KPI foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add KPI value
  const addKpiValue = useMutation({
    mutationFn: async (data: {
      kpi_id: string;
      value: number;
      reference_date: string;
      source?: 'manual' | 'integration' | 'calculation';
      notes?: string;
      created_by?: string;
      input_type?: 'partial' | 'consolidated';
    }) => {
      const client = assertSupabaseClient(supabase, "addKpiValue");
      const insertPayload = {
        kpi_id: data.kpi_id,
        value: data.value,
        reference_date: data.reference_date,
        source: data.source || "manual",
        notes: data.notes || null,
        created_by: data.created_by || null,
        input_type: data.input_type ?? 'consolidated',
      };
      const { data: result, error } = await client
        .from("kpi_values")
        .upsert(insertPayload, { onConflict: "kpi_id,reference_date" })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate KPI-specific queries
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.kpiValuesBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.forWizard({}), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detail(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.values(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      
      // CRITICAL: Invalidate OKR queries that depend on KPI primary values
      // This ensures KRs linked to this KPI update their progress/status
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krPrimaryKpiBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.krEffectiveValuesPrefix(), refetchType: 'active' });
      
      toast({
        title: "Valor salvo",
        description: "O valor do KPI foi salvo com sucesso.",
      });
    },
    onError: (error: unknown) => {
      // Conflito de consolidado por período é tratado via modal no dialog (não exibir toast).
      const hint = (error as { hint?: string } | null)?.hint ?? '';
      if (typeof hint === 'string' && hint.startsWith('kpi_consolidated_period_conflict')) return;
      const copy = getKpiValueCreateErrorCopy(error);
      toast({
        title: copy.title,
        description: copy.description,
        variant: "destructive",
      });
    },

  });

  return {
    kpis: kpisWithValues,
    isLoading,
    error,
    createKpi,
    addKpiValue,
  };
}

// Hook for fetching a single KPI with full history
export function useKpiDetail(kpiId: string) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  
  const { data: kpi, isLoading } = useQuery({
    queryKey: queryKeys.kpis.detail(kpiId, currentBuId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("kpi_metrics")
        .select(`
          id, name, description, category, bu_id, owner_user_id, team_id,
          unit, direction,
          consolidation_frequency, update_frequency, update_mode, frequency_migration_reviewed,
          target_value, status, is_global,
          created_at, updated_at, deleted_at,
          indicator_type, lifecycle_status, target_source, recovery_protocol,
          area_id, scope, responsible_area_id, responsible_team_id,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          responsible_team:teams!kpi_metrics_responsible_team_id_fkey(id, name),
          responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color)
        `)
        .eq("id", kpiId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // BU isolation: ensure KPI belongs to current BU
      if (currentBuId && (data as any).bu_id !== currentBuId) return null;

      return data as DbKpiMetric | null;
    },
    enabled: !!supabase && !!kpiId,
  });

  const { data: values } = useQuery({
    queryKey: queryKeys.kpis.values(kpiId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async (): Promise<KpiValue[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("kpi_values")
        .select(`
          id, kpi_id, value, reference_date, source, notes, created_by, created_at,
          period_start, period_end, period_label, rag_status, input_type
        `)
        .eq("kpi_id", kpiId)
        .order("reference_date", { ascending: false });

      if (error) throw error;

      const rawValues = (data as DbKpiValue[]) || [];
      const userIds = [...new Set(rawValues.map((value) => value.created_by).filter((id): id is string => Boolean(id)))];

      let userMap: Record<string, { id: string; display_name: string; photo_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = currentBuId
          ? await supabase
              .from("v_bu_active_profiles")
              .select("id, display_name, photo_url")
              .eq("bu_id", currentBuId)
              .in("id", userIds)
          : await supabase
              .from("v_profiles_directory")
              .select("id, display_name, photo_url")
              .in("id", userIds);

        if (profilesError) throw profilesError;

        userMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = {
            id: profile.id,
            display_name: profile.display_name || "Usuário",
            photo_url: profile.photo_url,
          };
          return acc;
        }, {} as typeof userMap);
      }

      return rawValues.map((value) => ({
        ...value,
        source: mapSource(value.source),
        rag_status: value.rag_status as KpiValue["rag_status"],
        created_by_user: value.created_by ? userMap[value.created_by] || null : null,
      }));
    },
    enabled: !!supabase && !!kpiId,
  });

  return {
    kpi: kpi ? {
      ...kpi,
      bu_id: kpi.bu_id || '',
      frequency: valueFrequencyToLegacy(kpi.consolidation_frequency ?? null),
      source_type: 'manual' as const,
      source_config: null,
      visibility: 'bu' as const,
      linked_okrs: [],
      // v2.2 governance defaults
      area_id: kpi.area_id,
      scope: kpi.scope || 'team',
      area: kpi.area ?? null,
      team: kpi.team ?? null,
      responsible_area: kpi.responsible_area ?? null,
      responsible_team: kpi.responsible_team ?? null,
      // v3.33.0 — SSOT exibição
      effective_area: kpi.area ?? kpi.responsible_area ?? null,
      effective_team: kpi.team ?? kpi.responsible_team ?? null,
    } : null,
    values: values || [],
    isLoading,
  };
}
