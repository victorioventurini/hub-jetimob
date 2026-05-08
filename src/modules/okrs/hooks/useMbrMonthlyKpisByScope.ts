/**
 * useMbrMonthlyKpisByScope — Snapshot mensal de KPIs por escopo (org/area)
 * para o overview do MBR Executivo (KPI Gate).
 *
 * Mesma semântica de bucket mensal de `useMbrPreTeamKpisMonthly`:
 *   - `currentValue` = último valor no mês de referência
 *   - `previousValue` = último valor no mês imediatamente anterior
 *
 * Não filtra por `responsible_team_id` (é por escopo, não por time).
 * Inclui joins de área e time para permitir agrupamento na UI.
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
  quarterBoundsOfMonth,
  previousQuarterBoundsOfMonth,
  yearBoundsOfMonth,
  previousYearBoundsOfMonth,
} from '@/modules/okrs/utils/mbr/referenceMonth';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

export type KpiScope = 'org' | 'area' | 'team';

export interface MbrMonthlyKpiSnapshot extends MbrKpiSnapshot {
  areaId: string | null;
  areaName: string | null;
  areaColor: string | null;
  teamName: string | null;
  indicatorType: string | null;
  owner: { id: string; display_name: string; photo_url: string | null } | null;
}

interface KpiRow {
  id: string;
  name: string;
  unit: string | null;
  direction: 'up' | 'down' | 'maintain' | null;
  target_value: number | null;
  scope: KpiScope | null;
  indicator_type: string | null;
  consolidation_frequency: string | null;
  responsible_team_id: string | null;
  owner_user_id: string | null;
  area_id: string | null;
  responsible_area_id: string | null;
  area: { id: string; name: string; color: string | null } | null;
  responsible_area: { id: string; name: string; color: string | null } | null;
  /** Alias do join `responsible_team_id` (operacional) — usado em todo o hook. */
  team: { id: string; name: string } | null;
  owner: { id: string; display_name: string; photo_url: string | null } | null;
}

interface KpiValueRow {
  kpi_id: string;
  value: number;
  reference_date: string;
  rag_status: string | null;
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
    if (target === 0) achievementPct = current === 0 ? 100 : 0;
    else achievementPct = (target / Math.max(current, 0.0001)) * 100;
  } else {
    if (target === 0) achievementPct = 100;
    else achievementPct = (current / target) * 100;
  }
  if (achievementPct >= 90) return 'green';
  if (achievementPct >= 70) return 'yellow';
  return 'red';
}

export interface UseMbrMonthlyKpisByScopeResult {
  snapshots: MbrMonthlyKpiSnapshot[];
  isLoading: boolean;
}

export function useMbrMonthlyKpisByScope(
  referenceMonth: string | null | undefined,
  scopes: KpiScope[],
): UseMbrMonthlyKpisByScopeResult {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const refMonth = referenceMonth || defaultReferenceMonth();
  const prevMonth = useMemo(() => previousMonthOf(refMonth), [refMonth]);
  const scopesKey = useMemo(() => [...scopes].sort().join(','), [scopes]);

  const { data, isLoading } = useQuery({
    queryKey: mbrKeys.monthlyKpisByScope(currentBuId, refMonth, scopesKey),
    enabled: !!supabase && !!currentBuId && scopes.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const refBounds = monthBoundsDate(refMonth);
      const prevBounds = monthBoundsDate(prevMonth);
      if (!refBounds || !prevBounds) {
        return { kpis: [] as KpiRow[], values: [] as KpiValueRow[] };
      }

      const { data: kpis, error: kpisErr } = await supabase
        .from('kpi_metrics')
        .select(
          `id, name, unit, direction, target_value, scope, indicator_type, consolidation_frequency, responsible_team_id, owner_user_id, area_id, responsible_area_id,
           area:areas!kpi_metrics_area_id_fkey(id, name, color),
           responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color),
           team:teams!kpi_metrics_responsible_team_id_fkey(id, name),
           owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url)`,
        )
        .eq('bu_id', currentBuId!)
        .in('scope', scopes)
        .neq('indicator_type', 'metric')
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null);
      if (kpisErr) throw kpisErr;
      const kpiRows = (kpis ?? []) as unknown as KpiRow[];
      if (kpiRows.length === 0) return { kpis: kpiRows, values: [] as KpiValueRow[] };

      // Janela ampla cobre buckets mensal/trimestral/anual (até 1 ano antes
      // do mês de referência) — necessário para KPIs com cadência > mensal.
      const prevYearBounds = previousYearBoundsOfMonth(refMonth);
      const fetchStart = prevYearBounds?.start ?? prevBounds.start;
      const kpiIds = kpiRows.map((k) => k.id);
      const { data: values, error: valsErr } = await supabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, rag_status')
        .in('kpi_id', kpiIds)
        .gte('reference_date', fetchStart)
        .lte('reference_date', refBounds.end)
        .order('reference_date', { ascending: false });
      if (valsErr) throw valsErr;

      return { kpis: kpiRows, values: (values ?? []) as KpiValueRow[] };
    },
  });

  const snapshots = useMemo<MbrMonthlyKpiSnapshot[]>(() => {
    if (!data) return [];
    const monthRefBounds = monthBoundsDate(refMonth);
    const monthPrevBounds = monthBoundsDate(prevMonth);
    const quarterRefBounds = quarterBoundsOfMonth(refMonth);
    const quarterPrevBounds = previousQuarterBoundsOfMonth(refMonth);
    const yearRefBounds = yearBoundsOfMonth(refMonth);
    const yearPrevBounds = previousYearBoundsOfMonth(refMonth);
    if (!monthRefBounds || !monthPrevBounds) return [];

    // Pré-agrupa valores por KPI (já vem ordenado desc por reference_date).
    const byKpi = new Map<string, KpiValueRow[]>();
    for (const v of data.values) {
      const arr = byKpi.get(v.kpi_id);
      if (arr) arr.push(v);
      else byKpi.set(v.kpi_id, [v]);
    }

    const pickInRange = (
      rows: KpiValueRow[] | undefined,
      bounds: { start: string; end: string } | null,
    ): KpiValueRow | undefined => {
      if (!rows || !bounds) return undefined;
      // rows está em ordem desc por data → primeiro match é o mais recente.
      return rows.find((r) => r.reference_date >= bounds.start && r.reference_date <= bounds.end);
    };

    return data.kpis.map((k): MbrMonthlyKpiSnapshot => {
      const freq = (k.consolidation_frequency ?? '').toLowerCase();
      let refBounds = monthRefBounds;
      let prevBoundsLocal = monthPrevBounds;
      if (freq === 'quarterly') {
        refBounds = quarterRefBounds ?? monthRefBounds;
        prevBoundsLocal = quarterPrevBounds ?? monthPrevBounds;
      } else if (freq === 'yearly' || freq === 'annual') {
        refBounds = yearRefBounds ?? monthRefBounds;
        prevBoundsLocal = yearPrevBounds ?? monthPrevBounds;
      }

      const rows = byKpi.get(k.id);
      const cur = pickInRange(rows, refBounds);
      const prev = pickInRange(rows, prevBoundsLocal);
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
        teamId: k.responsible_team_id ?? null,
        direction: k.direction === 'maintain' ? null : (k.direction ?? null),
        // v3.33.0 — área efetiva (estrutural com fallback operacional).
        areaId: k.area?.id ?? k.responsible_area?.id ?? k.area_id ?? k.responsible_area_id ?? null,
        areaName: k.area?.name ?? k.responsible_area?.name ?? null,
        areaColor: k.area?.color ?? k.responsible_area?.color ?? null,
        teamName: k.team?.name ?? null,
        indicatorType: k.indicator_type ?? null,
        owner: k.owner ?? null,
      };
    });
  }, [data, refMonth, prevMonth]);

  return { snapshots, isLoading };
}
