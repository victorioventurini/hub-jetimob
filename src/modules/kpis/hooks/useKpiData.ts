import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiCategory, KpiWithValues, KpiValue, calculateRagStatus } from "../types";
import { useToast } from "@/hooks/use-toast";

interface UseKpiDataOptions {
  category?: KpiCategory;
  teamId?: string;
  ownerId?: string;
}

// Types that match the database schema (without the new fields we added to the local types)
interface DbKpiMetric {
  id: string;
  name: string;
  description: string | null;
  category: KpiCategory;
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
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
}

interface DbKpiValue {
  id: string;
  kpi_id: string;
  value: number;
  reference_date: string;
  source: 'manual' | 'integration' | 'calculation';
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useKpiData(options: UseKpiDataOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { category, teamId, ownerId } = options;

  // Fetch all KPIs with their latest values
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ["kpis", category, teamId, ownerId],
    queryFn: async () => {
      let query = supabase
        .from("kpi_metrics")
        .select(`
          *,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name)
        `)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("category")
        .order("name");

      if (category) {
        query = query.eq("category", category);
      }
      if (teamId) {
        query = query.eq("team_id", teamId);
      }
      if (ownerId) {
        query = query.eq("owner_user_id", ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DbKpiMetric[];
    },
  });

  // Fetch values for all KPIs
  const { data: allValues } = useQuery({
    queryKey: ["kpi-values", kpis?.map((k) => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from("kpi_values")
        .select("*")
        .in(
          "kpi_id",
          kpis.map((k) => k.id)
        )
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as DbKpiValue[];
    },
    enabled: !!kpis && kpis.length > 0,
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

    // Map DB values to our extended type with defaults
    const mappedValues: KpiValue[] = values.map(v => ({
      ...v,
      source: v.source === 'integration' ? 'api' : v.source === 'calculation' ? 'database' : 'manual',
    }));

    return {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      category: kpi.category,
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
      owner: kpi.owner,
      team: kpi.team,
      values: mappedValues,
      current_value: currentValue,
      previous_value: previousValue,
      variation,
      trend,
      rag_status: calculateRagStatus(currentValue, kpi.target_value, kpi.direction),
      // Campos de auditoria
      last_updated_at: lastValue?.created_at ?? null,
      last_update_source: lastValue 
        ? (lastValue.source === 'integration' ? 'api' : lastValue.source === 'calculation' ? 'database' : 'manual') 
        : null,
      last_updated_by: lastValue?.created_by ?? null,
      last_updated_by_user: null,
    };
  });

  // Create KPI (uses database schema)
  const createKpi = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string | null;
      category: KpiCategory;
      unit: string;
      direction: 'up' | 'down';
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      team_id: string | null;
      owner_user_id: string | null;
      target_value: number | null;
      status: 'active' | 'inactive';
    }) => {
      const { data: result, error } = await supabase
        .from("kpi_metrics")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
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
    }) => {
      const { data: result, error } = await supabase
        .from("kpi_values")
        .insert({
          kpi_id: data.kpi_id,
          value: data.value,
          reference_date: data.reference_date,
          source: data.source || "manual",
          notes: data.notes || null,
          created_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-values"] });
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
  const { data: kpi, isLoading } = useQuery({
    queryKey: ["kpi", kpiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_metrics")
        .select(`
          *,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name)
        `)
        .eq("id", kpiId)
        .maybeSingle();

      if (error) throw error;
      return data as DbKpiMetric | null;
    },
    enabled: !!kpiId,
  });

  const { data: values } = useQuery({
    queryKey: ["kpi-values", kpiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_values")
        .select("*")
        .eq("kpi_id", kpiId)
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as DbKpiValue[];
    },
    enabled: !!kpiId,
  });

  // Map to extended type
  const mappedValues: KpiValue[] = (values || []).map(v => ({
    ...v,
    source: v.source === 'integration' ? 'api' : v.source === 'calculation' ? 'database' : 'manual',
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
    } : null,
    values: mappedValues,
    isLoading,
  };
}
