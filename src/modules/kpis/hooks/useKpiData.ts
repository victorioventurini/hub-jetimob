import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { KpiWithValues, KpiValue, KpiValueSource, KpiScope, KpiIndicatorType, KpiLifecycleStatus, calculateRagStatus } from "../types";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { assertSupabaseClient } from "@/lib/supabaseGuard";

// Helper to normalize source types
function mapSource(source: string): KpiValueSource {
  if (source === 'integration') return 'api';
  if (source === 'calculation') return 'database';
  return source as KpiValueSource;
}

// v2.82.0: category deprecated - using areaId for filtering
interface UseKpiDataOptions {
  /** @deprecated v2.82.0 - Use areaId instead */
  category?: string;
  teamId?: string;
  ownerId?: string;
  areaId?: string;
  scope?: KpiScope;
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
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
  area?: {
    id: string;
    name: string;
    color: string | null;
  };
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
  confidence: 'high' | 'medium' | 'low';
  rag_status: string | null;
}

export function useKpiData(options: UseKpiDataOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  // v2.82.0: category deprecated - using areaId for filtering
  const { teamId, ownerId, areaId, scope } = options;

  // Fetch all KPIs with their latest values
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.list(null, { teamId, ownerId, areaId, scope }),
    enabled: !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!supabase) return [];
      let query = supabase
        .from("kpi_metrics")
        .select(`
          id, name, description, category, bu_id, owner_user_id, team_id,
          unit, direction, frequency, target_value, status, is_global,
          created_at, updated_at, deleted_at,
          indicator_type, lifecycle_status, target_source, recovery_protocol,
          area_id, scope,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color)
        `)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("area_id", { nullsFirst: false })
        .order("name");

      // v2.82.0: category filter removed - use areaId instead
      if (teamId) {
        query = query.eq("team_id", teamId);
      }
      if (ownerId) {
        query = query.eq("owner_user_id", ownerId);
      }
      if (areaId) {
        query = query.eq("area_id", areaId);
      }
      if (scope) {
        query = query.eq("scope", scope);
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
          period_start, period_end, period_label, confidence, rag_status
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
      confidence: v.confidence || 'medium',
      rag_status: v.rag_status as KpiValue['rag_status'],
    }));

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
      frequency: kpi.frequency === 'quarterly' ? 'quarterly' : kpi.frequency,
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
      owner: kpi.owner,
      team: kpi.team,
      area: kpi.area,
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
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
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

  // Add KPI value (supports v2.1 confidence field)
  const addKpiValue = useMutation({
    mutationFn: async (data: {
      kpi_id: string;
      value: number;
      reference_date: string;
      source?: 'manual' | 'integration' | 'calculation';
      notes?: string;
      created_by?: string;
      confidence?: 'high' | 'medium' | 'low';
    }) => {
      const client = assertSupabaseClient(supabase, "addKpiValue");
      const { data: result, error } = await client
        .from("kpi_values")
        .insert({
          kpi_id: data.kpi_id,
          value: data.value,
          reference_date: data.reference_date,
          source: data.source || "manual",
          notes: data.notes || null,
          created_by: data.created_by || null,
          confidence: data.confidence || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.kpiValuesBatchPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.forWizard({}), refetchType: 'active' });
      toast({
        title: "Valor registrado",
        description: "O valor do KPI foi registrado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar valor",
        description: error.message,
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
  
  const { data: kpi, isLoading } = useQuery({
    queryKey: queryKeys.kpis.detail(kpiId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("kpi_metrics")
        .select(`
          id, name, description, category, bu_id, owner_user_id, team_id,
          unit, direction, frequency, target_value, status, is_global,
          created_at, updated_at, deleted_at,
          indicator_type, lifecycle_status, target_source, recovery_protocol,
          area_id, scope,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color)
        `)
        .eq("id", kpiId)
        .maybeSingle();

      if (error) throw error;
      return data as DbKpiMetric | null;
    },
    enabled: !!supabase && !!kpiId,
  });

  const { data: values } = useQuery({
    queryKey: queryKeys.kpis.values(kpiId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("kpi_values")
        .select(`
          id, kpi_id, value, reference_date, source, notes, created_by, created_at,
          period_start, period_end, period_label, confidence, rag_status
        `)
        .eq("kpi_id", kpiId)
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as DbKpiValue[];
    },
    enabled: !!supabase && !!kpiId,
  });

  // Map to extended type
  const mappedValues: KpiValue[] = (values || []).map(v => ({
    ...v,
    source: mapSource(v.source),
    confidence: v.confidence || 'medium',
    rag_status: v.rag_status as KpiValue['rag_status'],
  }));

  return {
    kpi: kpi ? {
      ...kpi,
      bu_id: kpi.bu_id || '',
      frequency: kpi.frequency === 'quarterly' ? 'quarterly' as const : kpi.frequency,
      source_type: 'manual' as const,
      source_config: null,
      visibility: 'bu' as const,
      linked_okrs: [],
      // v2.2 governance defaults
      area_id: kpi.area_id,
      scope: kpi.scope || 'team',
      area: kpi.area,
    } : null,
    values: mappedValues,
    isLoading,
  };
}
