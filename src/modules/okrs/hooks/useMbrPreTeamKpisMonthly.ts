/**
 * useMbrPreTeamKpisMonthly — Snapshot MENSAL de KPIs do time para a Abertura
 * do Pré-MBR.
 *
 * Diferente do `useKpisForWizardV2` (que devolve o estado ATUAL do KPI para o
 * KPI Gate), este hook ancora `currentValue` no último valor consolidado do
 * mês de referência e `previousValue` no último valor consolidado do mês
 * imediatamente anterior — exatamente o que a Análise IA do mês precisa.
 *
 * Filtros:
 *   - `kpi_metrics.responsible_team_id = teamId`
 *   - `bu_id = currentBuId` (BU isolation — Core memory)
 *   - `deleted_at IS NULL`
 *   - `lifecycle_status IN ('active','proposed')`
 *
 * Valores: pega o último `kpi_values.value` por KPI dentro de cada bucket
 * mensal (mês de referência e mês anterior), usando `reference_date`.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import {
  defaultReferenceMonth,
  monthBoundsDate,
  previousMonthOf,
} from '@/modules/okrs/utils/mbr/referenceMonth';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

interface KpiRow {
  id: string;
  name: string;
  unit: string | null;
  direction: 'up' | 'down' | 'maintain' | null;
  target_value: number | null;
  scope: 'org' | 'area' | 'team' | null;
  responsible_team_id: string | null;
  area_id: string | null;
  responsible_area_id: string | null;
  area: { id: string; name: string; color: string | null } | null;
  responsible_area: { id: string; name: string; color: string | null } | null;
  team: { id: string; name: string } | null;
}

interface KpiValueRow {
  kpi_id: string;
  value: number;
  reference_date: string;
  rag_status: string | null;
  input_type: 'partial' | 'consolidated' | null;
}

function deriveRagFromValue(
  current: number | null,
  target: number | null,
  direction: 'up' | 'down' | 'maintain' | null,
): MbrKpiSnapshot['ragStatus'] {
  if (current == null) return 'no_data';
  if (target == null) return 'green';
  const dir = direction ?? 'up';
  let achievementPct: number;
  if (dir === 'down') {
    // Quanto menor, melhor: 100% se current <= target.
    if (target === 0) achievementPct = current === 0 ? 100 : 0;
    else achievementPct = (target / Math.max(current, 0.0001)) * 100;
  } else {
    // up/maintain
    if (target === 0) achievementPct = current === 0 ? 100 : 100;
    else achievementPct = (current / target) * 100;
  }
  if (achievementPct >= 90) return 'green';
  if (achievementPct >= 70) return 'yellow';
  return 'red';
}

export interface UseMbrPreTeamKpisMonthlyResult {
  snapshots: MbrKpiSnapshot[];
  isLoading: boolean;
}

export function useMbrPreTeamKpisMonthly(
  teamId: string | null | undefined,
  referenceMonth?: string | null,
): UseMbrPreTeamKpisMonthlyResult {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const refMonth = referenceMonth || defaultReferenceMonth();
  const prevMonth = useMemo(() => previousMonthOf(refMonth), [refMonth]);

  const { data, isLoading } = useQuery({
    queryKey: mbrKeys.preTeamKpisMonthly(currentBuId, teamId, refMonth),
    enabled: !!supabase && !!currentBuId && !!teamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const refBounds = monthBoundsDate(refMonth);
      const prevBounds = monthBoundsDate(prevMonth);
      if (!refBounds || !prevBounds) return { kpis: [] as KpiRow[], values: [] as KpiValueRow[] };

      // 1) KPIs do time
      const { data: kpis, error: kpisErr } = await supabase
        .from('kpi_metrics')
        .select(
          `id, name, unit, direction, target_value, scope, responsible_team_id, area_id, responsible_area_id,
           area:areas!kpi_metrics_area_id_fkey(id, name, color),
           responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color),
           team:teams!kpi_metrics_responsible_team_id_fkey(id, name)`,
        )
        .eq('bu_id', currentBuId!)
        .eq('responsible_team_id', teamId!)
        .is('deleted_at', null)
        .in('lifecycle_status', ['active', 'proposed']);
      if (kpisErr) throw kpisErr;
      const kpiRows = (kpis ?? []) as unknown as KpiRow[];
      if (kpiRows.length === 0) return { kpis: kpiRows, values: [] as KpiValueRow[] };

      // 2) Valores nos dois meses (consolidados ou parciais — pegamos o último por mês).
      const kpiIds = kpiRows.map((k) => k.id);
      const { data: values, error: valsErr } = await supabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, rag_status, input_type')
        .in('kpi_id', kpiIds)
        .gte('reference_date', prevBounds.start)
        .lte('reference_date', refBounds.end)
        .order('reference_date', { ascending: false });
      if (valsErr) throw valsErr;

      return { kpis: kpiRows, values: (values ?? []) as KpiValueRow[] };
    },
  });

  const snapshots = useMemo<MbrKpiSnapshot[]>(() => {
    if (!data) return [];
    const refBounds = monthBoundsDate(refMonth);
    const prevBounds = monthBoundsDate(prevMonth);
    if (!refBounds || !prevBounds) return [];

    // Index: kpi_id -> { current, previous, ragStatusFromCurrent }
    const lastInRef = new Map<string, KpiValueRow>();
    const lastInPrev = new Map<string, KpiValueRow>();
    for (const v of data.values) {
      const d = v.reference_date;
      if (d >= refBounds.start && d <= refBounds.end) {
        if (!lastInRef.has(v.kpi_id)) lastInRef.set(v.kpi_id, v); // valores já vêm ordenados desc
      } else if (d >= prevBounds.start && d <= prevBounds.end) {
        if (!lastInPrev.has(v.kpi_id)) lastInPrev.set(v.kpi_id, v);
      }
    }

    return data.kpis.map((k): MbrKpiSnapshot => {
      const cur = lastInRef.get(k.id);
      const prev = lastInPrev.get(k.id);
      const currentValue = cur ? Number(cur.value) : null;
      const previousValue = prev ? Number(prev.value) : null;
      const target = k.target_value != null ? Number(k.target_value) : null;
      const ragStatus = (cur?.rag_status as MbrKpiSnapshot['ragStatus'] | null)
        ?? deriveRagFromValue(currentValue, target, k.direction);
      return {
        kpiId: k.id,
        name: k.name,
        currentValue,
        previousValue,
        target,
        ragStatus,
        requiresStrategicDecision: false,
        unit: k.unit ?? undefined,
        lastValueAt: cur?.reference_date ?? null,
        scope: k.scope ?? undefined,
        areaId: k.area?.id ?? k.responsible_area?.id ?? k.area_id ?? k.responsible_area_id ?? null,
        areaName: k.area?.name ?? k.responsible_area?.name ?? null,
        areaColor: k.area?.color ?? k.responsible_area?.color ?? null,
        teamId: k.responsible_team_id ?? null,
        teamName: k.team?.name ?? null,
        direction: k.direction === 'maintain' ? null : (k.direction ?? null),
      };
    });
  }, [data, refMonth, prevMonth]);

  return { snapshots, isLoading };
}
