/**
 * useRitualAdherence - Hook for ritual adherence/health metrics
 * 
 * Supports filtering by date range, team, wizard type, and user.
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { subDays, format } from 'date-fns';

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

export interface AdherenceFilters {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  teamId?: string | null;
  wizardType?: string | null;
  userId?: string | null;
}

// ============================================================
// HOOK
// ============================================================

export function useRitualAdherence(filters: AdherenceFilters = {}) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const startDate = filters.startDate || defaultStart;
  const endDate = filters.endDate || today;

  return useQuery({
    queryKey: queryKeys.okrs.ritualAdherence(currentBu?.id ?? null, { startDate, endDate, teamId: filters.teamId, wizardType: filters.wizardType, userId: filters.userId }),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = buSupabase
        .from('ritual_occurrences')
        .select(`
          id, team_id, status, wizard_type, session_id,
          teams!ritual_occurrences_team_id_fkey ( name )
        `)
        .eq('bu_id', currentBu.id)
        .gte('planned_date', startDate)
        .lte('planned_date', endDate)
        .in('status', ['completed_on_time', 'completed_late', 'missed', 'scheduled']);

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.wizardType) {
        query = query.eq('wizard_type', filters.wizardType);
      }

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as any[];

      // If user filter is active, we need to check which occurrences
      // have sessions started by that user
      if (filters.userId) {
        const sessionIds = rows
          .map(r => r.session_id)
          .filter(Boolean) as string[];

        if (sessionIds.length > 0) {
          const { data: sessions } = await buSupabase
            .from('okr_wizard_sessions')
            .select('id, started_by')
            .in('id', sessionIds);

          const userSessionIds = new Set(
            (sessions ?? [])
              .filter((s: any) => s.started_by === filters.userId)
              .map((s: any) => s.id)
          );

          // Keep occurrences that either:
          // - have a session by this user (completed)
          // - have no session (missed/scheduled) — still relevant for the user
          rows = rows.filter(r =>
            !r.session_id || userSessionIds.has(r.session_id)
          );
        }
      }

      // Group by team
      const teamMap = new Map<string, { name: string; total: number; completed: number; missed: number }>();

      for (const row of rows) {
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
