/**
 * useKpiWithHistory - Hook para buscar KPI com histórico completo
 * 
 * Fornece dados formatados para gráficos e tabelas de evolução.
 * 
 * @see TCR v2.86.0
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { KpiValue, KpiDirection, KpiRagStatus, KpiValueSource, KpiIndicatorType, KpiLifecycleStatus, KpiScope, KpiFrequencyValue, KpiInputType } from "../types";
import { calculateRagStatus } from "../types";

export interface KpiWithHistoryData {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  direction: KpiDirection;
  target_value: number | null;
  target_source: string | null;
  indicator_type: KpiIndicatorType;
  lifecycle_status: KpiLifecycleStatus;
  scope: KpiScope;
  values: KpiValue[];
  currentValue: number | null;
  previousValue: number | null;
  trend: 'up' | 'down' | 'stable';
  variation: number | null;
  ragStatus: KpiRagStatus;
  totalValues: number;
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
  /** v3.33.0 — `area ?? responsible_area`. SSOT para exibição. */
  effective_area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  /** v3.33.0 — `team ?? responsible_team`. SSOT para exibição. */
  effective_team?: {
    id: string;
    name: string;
  } | null;
}

export function useKpiWithHistory(kpiId: string | null | undefined) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: queryKeys.kpis.kpiWithHistory(kpiId ?? null),
    queryFn: async (): Promise<KpiWithHistoryData | null> => {
      if (!kpiId || !supabase) return null;

      // Fetch KPI details
      const { data: kpi, error: kpiError } = await supabase
        .from('kpi_metrics')
        .select(`
          id, name, description, unit, direction, target_value, target_source,
          indicator_type, lifecycle_status, scope, bu_id,
          owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
          team:teams!kpi_metrics_team_id_fkey(id, name),
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          responsible_team:teams!kpi_metrics_responsible_team_id_fkey(id, name),
          responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color)
        `)
        .eq('id', kpiId)
        .maybeSingle();

      if (kpiError) throw kpiError;
      if (!kpi) return null;

      // BU isolation: ensure KPI belongs to current BU
      if (currentBuId && (kpi as any).bu_id !== currentBuId) return null;

      // Fetch values with user info
      const { data: rawValues, error: valuesError } = await supabase
        .from('kpi_values')
        .select(`
          id, kpi_id, value, reference_date, source, notes, created_by, created_at,
          period_start, period_end, period_label, rag_status
        `)
        .eq('kpi_id', kpiId)
        .order('reference_date', { ascending: false })
        .limit(100);

      if (valuesError) throw valuesError;

      // Get unique user IDs
      const userIds = [...new Set((rawValues || []).map(v => v.created_by).filter(Boolean))];

      // Fetch user profiles
      let userMap: Record<string, { id: string; display_name: string; photo_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('v_profiles_directory')
          .select('id, display_name, photo_url')
          .in('id', userIds);

        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.id] = {
              id: p.id,
              display_name: p.display_name || 'Usuário',
              photo_url: p.photo_url,
            };
            return acc;
          }, {} as typeof userMap);
        }
      }

      // Map values with user info
      const values: KpiValue[] = (rawValues || []).map(v => ({
        id: v.id,
        kpi_id: v.kpi_id,
        value: v.value,
        reference_date: v.reference_date,
        source: v.source as KpiValueSource,
        notes: v.notes,
        created_by: v.created_by,
        created_at: v.created_at,
        period_start: v.period_start,
        period_end: v.period_end,
        period_label: v.period_label,
        rag_status: v.rag_status as KpiRagStatus | null,
        created_by_user: v.created_by ? userMap[v.created_by] || null : null,
      }));

      // Calculate trend
      const currentValue = values[0]?.value ?? null;
      const previousValue = values[1]?.value ?? null;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let variation: number | null = null;

      if (currentValue !== null && previousValue !== null && previousValue !== 0) {
        variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        if (variation > 0.5) trend = 'up';
        else if (variation < -0.5) trend = 'down';
      }

      return {
        id: kpi.id,
        name: kpi.name,
        description: kpi.description,
        unit: kpi.unit,
        direction: kpi.direction as KpiDirection,
        target_value: kpi.target_value,
        target_source: kpi.target_source,
        indicator_type: (kpi.indicator_type || 'kpi') as KpiIndicatorType,
        lifecycle_status: (kpi.lifecycle_status || 'active') as KpiLifecycleStatus,
        scope: (kpi.scope || 'team') as KpiScope,
        values,
        currentValue,
        previousValue,
        trend,
        variation,
        ragStatus: calculateRagStatus(currentValue, kpi.target_value, kpi.direction as KpiDirection),
        totalValues: values.length,
        area: (kpi as any).area ?? null,
        owner: kpi.owner,
        team: (kpi as any).team ?? null,
        responsible_area: (kpi as any).responsible_area ?? null,
        responsible_team: (kpi as any).responsible_team ?? null,
        effective_area: (kpi as any).area ?? (kpi as any).responsible_area ?? null,
        effective_team: (kpi as any).team ?? (kpi as any).responsible_team ?? null,
      };
    },
    enabled: !!kpiId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
