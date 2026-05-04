/**
 * Carrega KPIs (escopo org + área) com último valor por KPI.
 * Estritamente leitura — não toca no draft.
 */
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';

export function useAllBuKpisForMbr() {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: [...mbrKeys.buKpis(currentBuId), 'scope:org+area'],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // MBR Executivo: somente KPIs de escopo global (org) ou de área.
      // KPIs de time são tratados nos Pré-MBRs por cada líder.
      const { data: kpis, error: kpiErr } = await buSupabase
        .from('kpi_metrics')
        .select(`
          id, name, unit, target_value, direction, frequency,
          lifecycle_status, scope, area_id, team_id,
          indicator_type,
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          team:teams!kpi_metrics_team_id_fkey(id, name)
        `)
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null)
        .neq('indicator_type', 'metric')
        .in('scope', ['org', 'area']);

      if (kpiErr || !kpis || kpis.length === 0) return [];

      const kpiIds = kpis.map((k) => k.id);
      const { data: latestValues } = await buSupabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, rag_status')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      const latestByKpi = new Map<
        string,
        { value: number; rag_status: string; reference_date: string }
      >();
      for (const v of latestValues || []) {
        if (!latestByKpi.has(v.kpi_id)) {
          latestByKpi.set(v.kpi_id, {
            value: v.value,
            rag_status: v.rag_status,
            reference_date: v.reference_date,
          });
        }
      }

      return kpis.map((kpi) => {
        const latest = latestByKpi.get(kpi.id);
        const areaData = kpi.area as { name?: string; color?: string } | null;
        const teamData = kpi.team as { name?: string } | null;
        return {
          ...kpi,
          latest_value: latest?.value ?? null,
          latest_rag_status: latest?.rag_status ?? 'no_data',
          latest_reference_date: latest?.reference_date ?? null,
          areaName: areaData?.name ?? null,
          areaColor: areaData?.color ?? null,
          teamName: teamData?.name ?? null,
        };
      });
    },
  });
}

/**
 * Carrega objetivos de time (com KRs) do ciclo, já filtrando soft-deleted.
 */
export function useAllTeamObjectivesForMbr(cycleId: string | undefined | null) {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: mbrKeys.teamObjectives(currentBuId, cycleId),
    enabled: !!buSupabase && !!currentBuId && !!cycleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, status, team_id,
          team:teams!okr_team_objectives_team_id_fkey(id, name),
          key_results:okr_team_key_results(
            id, title, status, current_value, baseline, target, direction, unit,
            owner_user_id, last_checkin_at,
            owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name)
          )
        `)
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', cycleId!)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .not('status', 'in', '(cancelled,discarded)');

      if (error) throw error;

      return (data || []).map((obj) => ({
        ...obj,
        key_results: (obj.key_results || []).filter((kr: unknown) => {
          const k = kr as { deleted_at?: string | null; cancelled_at?: string | null };
          return !k.deleted_at && !k.cancelled_at;
        }),
      }));
    },
  });
}
