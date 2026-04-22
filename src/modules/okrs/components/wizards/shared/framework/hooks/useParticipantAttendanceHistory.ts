/**
 * useParticipantAttendanceHistory
 *
 * Histórico de presença de uma pessoa em sessões de um determinado tipo de
 * rito (persona). Calcula taxa de presença e padrões básicos de ausência.
 *
 * Pensado para ser consumido por dashboards / página de pessoa, não pelo
 * Step 1 do wizard.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { attendanceKeys } from '@/lib/queryKeys/attendance';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface ParticipantAttendanceEntry {
  sessionId: string;
  isPresent: boolean;
  markedAt: string;
  wizardType: WizardPersona;
}

export interface ParticipantAttendanceHistoryReturn {
  history: ParticipantAttendanceEntry[];
  attendanceRate: number;
  totalSessions: number;
  presentSessions: number;
  isLoading: boolean;
  error: unknown;
}

interface UseParticipantAttendanceHistoryArgs {
  profileId: string | null;
  persona: WizardPersona | null;
  /** Limitar últimas N sessões (default 12) */
  limit?: number;
}

export function useParticipantAttendanceHistory({
  profileId,
  persona,
  limit = 12,
}: UseParticipantAttendanceHistoryArgs): ParticipantAttendanceHistoryReturn {
  const supabase = useBuScopedSupabase();

  const range = `last-${limit}`;

  const { data = [], isLoading, error } = useQuery({
    queryKey: attendanceKeys.participantHistory(profileId, persona, range),
    queryFn: async (): Promise<ParticipantAttendanceEntry[]> => {
      if (!profileId || !persona) return [];
      const { data, error } = await supabase
        .from('ritual_session_attendance')
        .select(
          'session_id, is_present, marked_at, okr_wizard_sessions!inner(wizard_type)',
        )
        .eq('participant_profile_id', profileId)
        .eq('okr_wizard_sessions.wizard_type', persona)
        .is('deleted_at', null)
        .order('marked_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        sessionId: r.session_id,
        isPresent: r.is_present,
        markedAt: r.marked_at,
        wizardType: (r.okr_wizard_sessions?.wizard_type ?? persona) as WizardPersona,
      }));
    },
    enabled: !!profileId && !!persona,
    staleTime: 5 * 60 * 1000,
  });

  const totalSessions = data.length;
  const presentSessions = data.filter((e) => e.isPresent).length;
  const attendanceRate = totalSessions > 0
    ? Math.round((100 * presentSessions) / totalSessions)
    : 0;

  return {
    history: data,
    attendanceRate,
    totalSessions,
    presentSessions,
    isLoading,
    error,
  };
}
