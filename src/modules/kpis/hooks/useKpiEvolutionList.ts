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
import type { KpiIndicatorType, KpiScope, KpiRagStatus, KpiDirection } from "../types";
import { calculateRagStatus } from "../types";

export interface KpiEvolutionItem {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  direction: KpiDirection;
  frequency: string;
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
  // Relations
  area?: {
    id: string;
    name: string;
    color: string | null;
  };
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

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.evolutionList(buId ?? null, { indicatorType, areaId, scope, teamId, ragStatus, search }),
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
          id, name, description, unit, direction, frequency, target_value,
          indicator_type, scope, created_at,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color)
        `)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');

      if (indicatorType) {
        query = query.eq('indicator_type', indicatorType);
      }
      if (areaId) {
        query = query.eq('area_id', areaId);
      }
      if (scope) {
        query = query.eq('scope', scope);
      }
      if (teamId) {
        query = query.eq('team_id', teamId);
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
      
      // Get value counts and latest 2 values for each KPI
      const { data: valuesData } = await supabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, created_at')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      // Group values by kpi_id
      const valuesByKpi: Record<string, Array<{ value: number; reference_date: string; created_at: string }>> = {};
      const countsByKpi: Record<string, number> = {};
      
      (valuesData || []).forEach(v => {
        if (!valuesByKpi[v.kpi_id]) {
          valuesByKpi[v.kpi_id] = [];
          countsByKpi[v.kpi_id] = 0;
        }
        countsByKpi[v.kpi_id]++;
        if (valuesByKpi[v.kpi_id].length < 2) {
          valuesByKpi[v.kpi_id].push(v);
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

        return {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          unit: kpi.unit,
          direction: kpi.direction as KpiDirection,
          frequency: kpi.frequency,
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
          area: kpi.area,
          owner: kpi.owner,
          team: kpi.team,
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
    enabled: !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    kpis: data?.kpis ?? [],
    aggregates: data?.aggregates ?? { total: 0, on_track: 0, at_risk: 0, off_track: 0, no_data: 0 },
    isLoading,
    error: error as Error | null,
  };
}
