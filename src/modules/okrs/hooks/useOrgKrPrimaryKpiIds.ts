/**
 * useOrgKrPrimaryKpiIds — Retorna o conjunto de KPI IDs vinculados como
 * `primary` a Key Results **Organizacionais** (kr_type='org') no escopo da BU.
 *
 * Usado no MBR step "Indicadores fora da meta" para listar apenas KPIs cujo
 * desempenho já é discutido nas OKRs Organizacionais.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';

export function useOrgKrPrimaryKpiIds() {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data, isLoading } = useQuery({
    queryKey: ['okr-org-kr-primary-kpi-ids', currentBuId],
    queryFn: async (): Promise<Set<string>> => {
      if (!supabase) return new Set();
      const { data, error } = await supabase
        .from('okr_kr_metrics')
        .select('kpi_id')
        .eq('kr_type', 'org')
        .eq('role', 'primary')
        .is('deleted_at', null);
      if (error) throw error;
      return new Set((data ?? []).map((r: { kpi_id: string }) => r.kpi_id).filter(Boolean));
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
  });

  return { kpiIds: data ?? new Set<string>(), isLoading };
}
