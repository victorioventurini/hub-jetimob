import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiMetric, KpiValue, KpiWithValues, KpiCategory } from "../types";
import { useToast } from "@/hooks/use-toast";

interface UseKpiDataOptions {
  category?: KpiCategory;
  teamId?: string;
  ownerId?: string;
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
      return data as KpiMetric[];
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
      return data as KpiValue[];
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

    let variation: number | null = null;
    let trend: "up" | "down" | "stable" = "stable";

    if (currentValue !== null && previousValue !== null && previousValue !== 0) {
      variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      if (variation > 0.5) trend = "up";
      else if (variation < -0.5) trend = "down";
    }

    return {
      ...kpi,
      values,
      current_value: currentValue,
      previous_value: previousValue,
      variation,
      trend,
    };
  });

  // Create KPI
  const createKpi = useMutation({
    mutationFn: async (
      data: Omit<KpiMetric, "id" | "created_at" | "updated_at" | "deleted_at" | "owner" | "team">
    ) => {
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
      source?: KpiValue["source"];
      notes?: string;
      created_by?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("kpi_values")
        .insert({
          ...data,
          source: data.source || "manual",
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
      return data as KpiMetric | null;
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
      return data as KpiValue[];
    },
    enabled: !!kpiId,
  });

  return {
    kpi,
    values: values || [],
    isLoading,
  };
}
