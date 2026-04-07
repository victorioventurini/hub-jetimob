/**
 * useActiveCycle — Hook para ciclo ativo baseado em status formal
 * 
 * Substitui a inferência por datas de useActiveCycles() por uma query
 * baseada no campo `status` (planning/active/closed).
 * 
 * @see Fase 6 — Plano de vínculo ciclos ↔ rituais
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import type { Cycle } from './useCycleData';

export interface CycleWithStatus extends Cycle {
  status: 'planning' | 'active' | 'closed';
  qbr_status?: string;
}

/**
 * Busca ciclos por status formal. Retorna o ciclo ativo (quarter prioritário)
 * e ciclos em planejamento.
 */
export function useActiveCycle() {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.activeCycle(buId),
    queryFn: async () => {
      if (!supabase || !buId) return { active: [], planning: [] };

      // Fetch active, planning AND the most-recently-closed quarter
      const [activeRes, closedRes] = await Promise.all([
        supabase
          .from('cycles')
          .select('id, name, type, start_date, end_date, planning_date, review_date, review_date_first_month, retro_date, parent_cycle_id, status, qbr_status')
          .eq('bu_id', buId)
          .in('status', ['active', 'planning'])
          .order('start_date', { ascending: true }),
        supabase
          .from('cycles')
          .select('id, name, type, start_date, end_date, planning_date, review_date, review_date_first_month, retro_date, parent_cycle_id, status, qbr_status')
          .eq('bu_id', buId)
          .eq('status', 'closed')
          .eq('type', 'quarter')
          .order('end_date', { ascending: false })
          .limit(1),
      ]);

      if (activeRes.error) throw activeRes.error;

      const active = (activeRes.data || []).filter((c: any) => c.status === 'active') as CycleWithStatus[];
      const planning = (activeRes.data || []).filter((c: any) => c.status === 'planning') as CycleWithStatus[];
      const lastClosedQuarter = (closedRes.data?.[0] ?? null) as CycleWithStatus | null;

      return { active, planning, lastClosedQuarter };
    },
    enabled: isReady && !!supabase && !!buId,
    staleTime: 2 * 60 * 1000,
  });

  // Prioritize quarter > semester > year
  const typePriority: Record<string, number> = { quarter: 1, semester: 2, year: 3 };

  const activeCycle = useMemo(() => {
    if (!data?.active?.length) return null;
    const sorted = [...data.active].sort((a, b) => {
      const pa = typePriority[a.type] ?? 99;
      const pb = typePriority[b.type] ?? 99;
      return pa - pb;
    });
    return sorted[0];
  }, [data?.active]);

  const activeQuarterlyCycle = useMemo(() => {
    return data?.active?.find(c => c.type === 'quarter') ?? null;
  }, [data?.active]);

  const planningCycles = useMemo(() => {
    return data?.planning ?? [];
  }, [data?.planning]);

  return {
    /** Ciclo ativo prioritário (quarter > semester > year) */
    activeCycle,
    /** Ciclo trimestral ativo especificamente */
    activeQuarterlyCycle,
    /** Todos os ciclos ativos */
    activeCycles: data?.active ?? [],
    /** Ciclos em planejamento */
    planningCycles,
    isLoading,
    error,
  };
}
