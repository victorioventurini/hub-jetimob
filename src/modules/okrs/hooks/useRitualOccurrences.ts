/**
 * useRitualOccurrences - Hook for fetching ritual occurrence data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================

export type OccurrenceStatus = 'scheduled' | 'completed_on_time' | 'completed_late' | 'missed' | 'rescheduled';

export interface RitualOccurrence {
  id: string;
  buId: string;
  cadenceId: string | null;
  wizardType: string;
  teamId: string | null;
  teamName: string | null;
  plannedDate: string;
  status: OccurrenceStatus;
  actualDate: string | null;
  rescheduledFrom: string | null;
  rescheduledTo: string | null;
  sessionId: string | null;
  notes: string | null;
}

export interface OccurrenceFilters {
  month?: number; // 0-11
  year?: number;
  teamId?: string | null;
  wizardType?: string | null;
}

const OCCURRENCE_FIELDS = `
  id, bu_id, cadence_id, wizard_type, team_id, planned_date,
  status, actual_date, rescheduled_from, rescheduled_to,
  session_id, notes,
  teams!ritual_occurrences_team_id_fkey ( name )
`;

function mapOccurrence(row: any): RitualOccurrence {
  return {
    id: row.id,
    buId: row.bu_id,
    cadenceId: row.cadence_id,
    wizardType: row.wizard_type,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    plannedDate: row.planned_date,
    status: row.status as OccurrenceStatus,
    actualDate: row.actual_date,
    rescheduledFrom: row.rescheduled_from,
    rescheduledTo: row.rescheduled_to,
    sessionId: row.session_id,
    notes: row.notes,
  };
}

// ============================================================
// HOOKS
// ============================================================

export function useRitualOccurrences(filters: OccurrenceFilters = {}) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  const year = filters.year ?? new Date().getFullYear();
  const month = filters.month ?? new Date().getMonth();

  // Date range for the month
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: queryKeys.okrs.ritualOccurrences(currentBu?.id ?? null, { year, month, teamId: filters.teamId, wizardType: filters.wizardType }),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = buSupabase
        .from('ritual_occurrences')
        .select(OCCURRENCE_FIELDS)
        .eq('bu_id', currentBu.id)
        .gte('planned_date', startDate)
        .lt('planned_date', endDate)
        .order('planned_date', { ascending: true });

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.wizardType) {
        query = query.eq('wizard_type', filters.wizardType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapOccurrence);
    },
    enabled: !!currentBu?.id,
  });
}

/**
 * Reschedule an occurrence
 */
export function useRescheduleOccurrence() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrenceId, newDate }: { occurrenceId: string; newDate: string }) => {
      // Get current occurrence
      const { data: occ, error: fetchErr } = await buSupabase
        .from('ritual_occurrences')
        .select('planned_date, rescheduled_from')
        .eq('id', occurrenceId)
        .single();

      if (fetchErr || !occ) throw fetchErr || new Error('Occurrence not found');

      const { error } = await buSupabase
        .from('ritual_occurrences')
        .update({
          status: 'rescheduled',
          rescheduled_from: occ.rescheduled_from || occ.planned_date,
          rescheduled_to: newDate,
          planned_date: newDate,
        })
        .eq('id', occurrenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null) });
      toast.success('Ocorrência reagendada');
    },
    onError: () => {
      toast.error('Erro ao reagendar');
    },
  });
}

/**
 * Get occurrence linked to a session (for history enrichment)
 */
export function useOccurrenceBySession(sessionId: string | null) {
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.okrs.ritualOccurrenceBySession(sessionId),
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await buSupabase
        .from('ritual_occurrences')
        .select('id, planned_date, actual_date, status, rescheduled_from')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}
