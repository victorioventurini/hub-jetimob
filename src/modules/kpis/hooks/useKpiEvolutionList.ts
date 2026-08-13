/**
 * useKpiEvolutionList - Hook para listagem de KPIs com dados de evolução
 * 
 * Fornece dados para a página /kpis/evolution com filtros e agregações.
 * 
 * @see TCR v2.86.0
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import type { KpiIndicatorType, KpiScope, KpiRagStatus, KpiDirection, KpiFrequencyValue, KpiTrendFilter, KpiTrendWindow } from "../types";
import { calculateRagStatus, KPI_TREND_WINDOW_DEFAULT } from "../types";
import { classifyKpiTrendSeries, type KpiTrendPoint, type KpiTrendResult } from "../utils/trendClassification";

export interface KpiEvolutionItem {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  direction: KpiDirection;
  update_frequency: KpiFrequencyValue | null;
  consolidation_frequency: KpiFrequencyValue | null;
  target_value: number | null;
  indicator_type: KpiIndicatorType;
  scope: KpiScope;
  // Current value data
  current_value: number | null;
  previous_value: number | null;
  variation: number | null;
  trend: 'up' | 'down' | 'stable';
  rag_status: KpiRagStatus;
  last_updated_at: string | null;
  total_values: number;
  /** v3.x — Série de consolidados da janela de tendência (asc por data). */
  consolidated_series: KpiTrendPoint[];
  /** v3.x — Tendência orientada à meta calculada sobre `consolidated_series`. */
  trend_class: KpiTrendFilter | null;
  /** v3.x — Metadados do cálculo (pontos, janela, inclinação orientada). */
  trend_meta: KpiTrendResult | null;
  // Relations
  area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
  responsible_area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  responsible_team?: {
    id: string;
    name: string;
  } | null;
  /** v3.33.0 — `area ?? responsible_area`. SSOT exibição. */
  effective_area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  /** v3.33.0 — `team ?? responsible_team`. SSOT exibição. */
  effective_team?: {
    id: string;
    name: string;
  } | null;
}

export interface KpiEvolutionAggregates {
  total: number;
  on_track: number;
  at_risk: number;
  off_track: number;
  no_data: number;
}

export interface UseKpiEvolutionListOptions {
  indicatorType?: KpiIndicatorType;
  areaId?: string;
  scope?: KpiScope;
  teamId?: string;
  ragStatus?: KpiRagStatus;
  search?: string;
  /** Janela (meses) dos consolidados usados na tendência. Default: 6. */
  trendWindowMonths?: KpiTrendWindow;
}

export interface UseKpiEvolutionListResult {
  kpis: KpiEvolutionItem[];
  aggregates: KpiEvolutionAggregates;
  isLoading: boolean;
  error: Error | null;
}

export function useKpiEvolutionList(options: UseKpiEvolutionListOptions = {}): UseKpiEvolutionListResult {
  const supabase = useOptionalBuScopedSupabase();
  const { buId } = useOptionalBuClient();
  const { indicatorType, areaId, scope, teamId, ragStatus, search } = options;
  const trendWindowMonths = options.trendWindowMonths ?? KPI_TREND_WINDOW_DEFAULT;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.evolutionList(buId ?? null, { indicatorType, areaId, scope, teamId, ragStatus, search, trendWindowMonths }),
    enabled: !!supabase && !!buId,
    queryFn: async (): Promise<{ kpis: KpiEvolutionItem[]; aggregates: KpiEvolutionAggregates }> => {
      if (!supabase) {
        return { 
          kpis: [], 
          aggregates: { total: 0, on_track: 0, at_risk: 0, off_track: 0, no_data: 0 } 
        };
      }

      // Fetch KPIs
      let query = supabase
        .from('kpi_metrics')
        .select(`
          id, name, description, unit, direction, consolidation_frequency, update_frequency, target_value,
          indicator_type, scope, created_at,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          responsible_team:teams!kpi_metrics_responsible_team_id_fkey(id, name),
          responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color)
        `)
        .eq('status', 'active')
        .eq('bu_id', buId!)
        .is('deleted_at', null)
        .order('name');

      if (indicatorType) {
        query = query.eq('indicator_type', indicatorType);
      }
      if (areaId) {
        // v3.33.0: inclui responsible_area_id (KPIs Globais cuja
        // responsabilidade operacional pertence à área).
        query = query.or(`area_id.eq.${areaId},responsible_area_id.eq.${areaId}`);
      }
      if (scope) {
        query = query.eq('scope', scope);
      }
      if (teamId) {
        // v2.90.0: inclui KPIs cujo time responsável (operacional) é o filtrado.
        query = query.or(`team_id.eq.${teamId},responsible_team_id.eq.${teamId}`);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data: kpisData, error: kpisError } = await query;
      if (kpisError) throw kpisError;

      if (!kpisData?.length) {
        return { 
          kpis: [], 
          aggregates: { total: 0, on_track: 0, at_risk: 0, off_track: 0, no_data: 0 } 
        };
      }

      // Fetch latest values for each KPI
      const kpiIds = kpisData.map(k => k.id);
      
      // Get value counts, latest 2 values e série consolidada da janela
      const { data: valuesData } = await supabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, created_at, input_type')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      // v3.x — Cutoff da janela de tendência (apenas consolidados).
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - trendWindowMonths);
      const cutoffIso = cutoff.toISOString().slice(0, 10);

      // Group values by kpi_id
      const valuesByKpi: Record<string, Array<{ value: number; reference_date: string; created_at: string }>> = {};
      const countsByKpi: Record<string, number> = {};
      const consolidatedByKpi: Record<string, KpiTrendPoint[]> = {};
      
      (valuesData || []).forEach(v => {
        if (!valuesByKpi[v.kpi_id]) {
          valuesByKpi[v.kpi_id] = [];
          countsByKpi[v.kpi_id] = 0;
          consolidatedByKpi[v.kpi_id] = [];
        }
        countsByKpi[v.kpi_id]++;
        if (valuesByKpi[v.kpi_id].length < 2) {
          valuesByKpi[v.kpi_id].push(v);
        }
        const inputType = (v as { input_type?: string | null }).input_type ?? 'consolidated';
        if (inputType !== 'partial' && v.reference_date >= cutoffIso) {
          consolidatedByKpi[v.kpi_id].push({ value: v.value, reference_date: v.reference_date });
        }
      });

      // Map KPIs with evolution data
      const kpis: KpiEvolutionItem[] = kpisData.map(kpi => {
        const values = valuesByKpi[kpi.id] || [];
        const currentValue = values[0]?.value ?? null;
        const previousValue = values[1]?.value ?? null;

        let variation: number | null = null;
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (currentValue !== null && previousValue !== null && previousValue !== 0) {
          variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
          if (variation > 0.5) trend = 'up';
          else if (variation < -0.5) trend = 'down';
        }

        const rag = calculateRagStatus(currentValue, kpi.target_value, kpi.direction as KpiDirection);

        // v3.x — Tendência sobre consolidados da janela (asc por data)
        const consolidatedSeries = (consolidatedByKpi[kpi.id] || [])
          .slice()
          .sort((a, b) => a.reference_date.localeCompare(b.reference_date));
        const trendMeta = classifyKpiTrendSeries(consolidatedSeries, kpi.direction as KpiDirection);

        return {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          unit: kpi.unit,
          direction: kpi.direction as KpiDirection,
          update_frequency: (kpi.update_frequency ?? null) as KpiFrequencyValue | null,
          consolidation_frequency: (kpi.consolidation_frequency ?? null) as KpiFrequencyValue | null,
          target_value: kpi.target_value,
          indicator_type: (kpi.indicator_type || 'kpi') as KpiIndicatorType,
          scope: (kpi.scope || 'team') as KpiScope,
          current_value: currentValue,
          previous_value: previousValue,
          variation,
          trend,
          rag_status: rag,
          last_updated_at: values[0]?.created_at || null,
          total_values: countsByKpi[kpi.id] || 0,
          consolidated_series: consolidatedSeries,
          trend_class: trendMeta?.trend ?? null,
          trend_meta: trendMeta,
          area: (kpi as any).area ?? null,
          owner: kpi.owner,
          team: (kpi as any).team ?? null,
          responsible_area: (kpi as any).responsible_area ?? null,
          responsible_team: (kpi as any).responsible_team ?? null,
          effective_area: (kpi as any).area ?? (kpi as any).responsible_area ?? null,
          effective_team: (kpi as any).team ?? (kpi as any).responsible_team ?? null,
        };
      });

      // Filter by RAG status if specified
      const filteredKpis = ragStatus 
        ? kpis.filter(k => k.rag_status === ragStatus)
        : kpis;

      // Calculate aggregates
      const aggregates: KpiEvolutionAggregates = {
        total: kpis.length,
        on_track: kpis.filter(k => k.rag_status === 'on_track').length,
        at_risk: kpis.filter(k => k.rag_status === 'at_risk').length,
        off_track: kpis.filter(k => k.rag_status === 'off_track').length,
        no_data: kpis.filter(k => k.rag_status === 'no_data').length,
      };

      return { kpis: filteredKpis, aggregates };
    },
    // enabled already set above
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    kpis: data?.kpis ?? [],
    aggregates: data?.aggregates ?? { total: 0, on_track: 0, at_risk: 0, off_track: 0, no_data: 0 },
    isLoading,
    error: error as Error | null,
  };
}
