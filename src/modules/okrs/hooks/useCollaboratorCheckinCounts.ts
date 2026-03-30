/**
 * useCollaboratorCheckinCounts - Dynamic counts of expected vs completed
 * collaborator check-ins for a team in a given period.
 * 
 * Uses RPCs:
 * - count_collaborator_checkin_expected(bu_id, team_id, cycle_id)
 * - count_collaborator_sessions_by_date(bu_id, team_id, start_date, end_date)
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { useActiveCycles } from '@/modules/okrs/hooks';
import { useMemo } from 'react';

export interface CollaboratorCheckinCounts {
  expectedCount: number;
  /** Map of 'YYYY-MM-DD' -> number of distinct users who completed */
  completedByDate: Map<string, number>;
}

/**
 * Returns expected participant count and per-date completed counts
 * for collaborator check-in occurrences within a date range.
 */
export function useCollaboratorCheckinCounts(
  teamId: string | null,
  startDate: string, // 'YYYY-MM-DD'
  endDate: string,   // 'YYYY-MM-DD'
) {
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const buSupabase = useBuScopedSupabase();
  const { data: activeCycles } = useActiveCycles();

  const cycleId = useMemo(
    () => activeCycles?.find(c => c.type === 'quarter')?.id ?? activeCycles?.[0]?.id ?? null,
    [activeCycles],
  );

  // Expected count (stable for the entire cycle)
  const expectedQuery = useQuery({
    queryKey: queryKeys.okrs.collaboratorCheckinExpected(buId, teamId, cycleId),
    queryFn: async () => {
      if (!buId || !teamId || !cycleId) return 0;
      const { data, error } = await buSupabase.rpc('count_collaborator_checkin_expected', {
        p_bu_id: buId,
        p_team_id: teamId,
        p_cycle_id: cycleId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!buId && !!teamId && !!cycleId,
    staleTime: 5 * 60 * 1000,
  });

  // Completed sessions by date
  const completedQuery = useQuery({
    queryKey: queryKeys.okrs.collaboratorSessionsByDate(buId, teamId, startDate, endDate),
    queryFn: async () => {
      if (!buId || !teamId) return new Map<string, number>();
      const { data, error } = await buSupabase.rpc('count_collaborator_sessions_by_date', {
        p_bu_id: buId,
        p_team_id: teamId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data as { session_date: string; completed_count: number }[]) ?? []) {
        map.set(row.session_date, row.completed_count);
      }
      return map;
    },
    enabled: !!buId && !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    expectedCount: expectedQuery.data ?? 0,
    completedByDate: completedQuery.data ?? new Map<string, number>(),
    isLoading: expectedQuery.isLoading || completedQuery.isLoading,
  };
}
