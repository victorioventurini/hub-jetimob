/**
 * useRitualAdherence - Hook for ritual adherence/health metrics
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface TeamAdherence {
  teamId: string;
  teamName: string;
  total: number;
  completed: number;
  missed: number;
  adherencePercent: number;
}

// ============================================================
// HOOK
// ============================================================

export function useRitualAdherence(days = 90) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.okrs.ritualAdherence(currentBu?.id ?? null, days),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data, error } = await buSupabase
        .from('ritual_occurrences')
        .select(`
          team_id, status,
          teams!ritual_occurrences_team_id_fkey ( name )
        `)
        .eq('bu_id', currentBu.id)
        .gte('planned_date', cutoff.toISOString().split('T')[0])
        .lte('planned_date', new Date().toISOString().split('T')[0])
        .in('status', ['completed_on_time', 'completed_late', 'missed', 'scheduled']);

      if (error) throw error;

      // Group by team
      const teamMap = new Map<string, { name: string; total: number; completed: number; missed: number }>();

      for (const row of (data ?? []) as any[]) {
        const teamId = row.team_id || '__bu__';
        const teamName = row.teams?.name || 'BU (sem time)';

        if (!teamMap.has(teamId)) {
          teamMap.set(teamId, { name: teamName, total: 0, completed: 0, missed: 0 });
        }

        const entry = teamMap.get(teamId)!;
        entry.total++;

        if (row.status === 'completed_on_time' || row.status === 'completed_late') {
          entry.completed++;
        } else if (row.status === 'missed') {
          entry.missed++;
        }
      }

      const results: TeamAdherence[] = [];
      for (const [teamId, entry] of teamMap) {
        results.push({
          teamId,
          teamName: entry.name,
          total: entry.total,
          completed: entry.completed,
          missed: entry.missed,
          adherencePercent: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
        });
      }

      // Sort by worst adherence first
      results.sort((a, b) => a.adherencePercent - b.adherencePercent);

      return results;
    },
    enabled: !!currentBu?.id,
    staleTime: 5 * 60 * 1000,
  });
}
