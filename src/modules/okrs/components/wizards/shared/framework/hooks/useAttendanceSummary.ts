/**
 * useAttendanceSummary
 *
 * Lê a view agregada `v_ritual_attendance_summary` para um sessionId.
 * Usado pelo contador "X de Y presentes responderam" e pelos dashboards.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { attendanceKeys } from '@/lib/queryKeys/attendance';

export interface AttendanceSummary {
  sessionId: string;
  presentCount: number;
  totalCount: number;
  attendanceRatePct: number | null;
}

export function useAttendanceSummary(sessionId: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: attendanceKeys.summary(sessionId),
    queryFn: async (): Promise<AttendanceSummary | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from('v_ritual_attendance_summary')
        .select('session_id, present_count, total_count, attendance_rate_pct')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        sessionId: data.session_id as string,
        presentCount: Number(data.present_count ?? 0),
        totalCount: Number(data.total_count ?? 0),
        attendanceRatePct: data.attendance_rate_pct === null
          ? null
          : Number(data.attendance_rate_pct),
      };
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000,
  });
}
