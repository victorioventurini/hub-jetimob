import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useMemo } from "react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface KpiHistoryValue {
  id: string;
  value: number;
  reference_date: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface KpiHistoryData {
  kpi: {
    id: string;
    name: string;
    unit: string;
    direction: "up" | "down";
    target_value: number | null;
  };
  values: KpiHistoryValue[];
  trend: "up" | "down" | "stable";
  currentValue: number | null;
  previousValue: number | null;
  variation: number | null;
}

/**
 * Fetches KPI values history for visualization
 */
export function useKpiHistory(kpiId: string | null | undefined, dateRange?: { start: string; end: string }) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["kpi-history", kpiId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!kpiId) return null;

      // Fetch KPI metadata
      const { data: kpi, error: kpiError } = await supabase
        .from("kpi_metrics")
        .select("id, name, unit, direction, target_value")
        .eq("id", kpiId)
        .maybeSingle();

      if (kpiError) throw kpiError;
      if (!kpi) return null;

      // Fetch values
      let query = supabase
        .from("kpi_values")
        .select("id, value, reference_date, source, notes, created_at")
        .eq("kpi_id", kpiId)
        .order("reference_date", { ascending: true });

      if (dateRange?.start) {
        query = query.gte("reference_date", dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte("reference_date", dateRange.end);
      }

      const { data: values, error: valuesError } = await query;
      if (valuesError) throw valuesError;

      // Calculate trend
      const sortedDesc = [...(values || [])].sort(
        (a, b) => new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
      );
      const currentValue = sortedDesc[0]?.value ?? null;
      const previousValue = sortedDesc[1]?.value ?? null;

      let trend: "up" | "down" | "stable" = "stable";
      let variation: number | null = null;

      if (currentValue !== null && previousValue !== null && previousValue !== 0) {
        variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        if (variation > 0.5) trend = "up";
        else if (variation < -0.5) trend = "down";
      }

      return {
        kpi: {
          id: kpi.id,
          name: kpi.name,
          unit: kpi.unit,
          direction: kpi.direction as "up" | "down",
          target_value: kpi.target_value,
        },
        values: values || [],
        trend,
        currentValue,
        previousValue,
        variation,
      } as KpiHistoryData;
    },
    enabled: !!kpiId,
  });
}

/**
 * Fetches KPI history for a KR (via okr_kr_metrics linkage)
 */
export function useKrKpiHistory(krId: string, krType: "org" | "team") {
  const supabase = useBuScopedSupabase();
  // First get the linked KPIs
  const { data: krMetrics } = useQuery({
    queryKey: ["kr-linked-kpis", krId, krType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_kr_metrics")
        .select("id, kpi_id, role")
        .eq("kr_id", krId)
        .eq("kr_type", krType)
        .is("deleted_at", null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!krId,
  });

  const primaryKpiId = krMetrics?.find((m) => m.role === "primary")?.kpi_id;
  const guardrailKpiIds = krMetrics?.filter((m) => m.role === "guardrail").map((m) => m.kpi_id) || [];

  // Fetch primary KPI history
  const { data: primaryHistory, isLoading: primaryLoading } = useKpiHistory(primaryKpiId);

  // Fetch guardrail KPI histories
  const { data: guardrailHistories, isLoading: guardrailsLoading } = useQuery({
    queryKey: ["kr-guardrail-histories", guardrailKpiIds],
    queryFn: async () => {
      if (guardrailKpiIds.length === 0) return [];

      const histories = await Promise.all(
        guardrailKpiIds.map(async (kpiId) => {
          const { data: kpi } = await supabase
            .from("kpi_metrics")
            .select("id, name, unit, direction, target_value")
            .eq("id", kpiId)
            .maybeSingle();

          const { data: values } = await supabase
            .from("kpi_values")
            .select("id, value, reference_date, source, notes, created_at")
            .eq("kpi_id", kpiId)
            .order("reference_date", { ascending: true });

          if (!kpi) return null;

          return {
            kpi: {
              id: kpi.id,
              name: kpi.name,
              unit: kpi.unit,
              direction: kpi.direction as "up" | "down",
              target_value: kpi.target_value,
            },
            values: values || [],
          };
        })
      );

      return histories.filter(Boolean);
    },
    enabled: guardrailKpiIds.length > 0,
  });

  return {
    primaryHistory,
    guardrailHistories: guardrailHistories || [],
    isLoading: primaryLoading || guardrailsLoading,
    hasPrimaryKpi: !!primaryKpiId,
    hasGuardrails: guardrailKpiIds.length > 0,
  };
}

/**
 * Formats KPI history for chart display
 */
export function useKpiChartData(history: KpiHistoryData | null | undefined) {
  return useMemo(() => {
    if (!history?.values.length) {
      return {
        data: [],
        minValue: 0,
        maxValue: 100,
        targetLine: null,
      };
    }

    const data = history.values.map((v) => ({
      date: format(parseISO(v.reference_date), "dd/MM", { locale: ptBR }),
      fullDate: format(parseISO(v.reference_date), "dd MMM yyyy", { locale: ptBR }),
      value: v.value,
      target: history.kpi.target_value,
    }));

    const values = history.values.map((v) => v.value);
    const minValue = Math.min(...values, history.kpi.target_value || Infinity) * 0.9;
    const maxValue = Math.max(...values, history.kpi.target_value || 0) * 1.1;

    return {
      data,
      minValue: Math.floor(minValue),
      maxValue: Math.ceil(maxValue),
      targetLine: history.kpi.target_value,
    };
  }, [history]);
}
