/**
 * useCompletedSessionForCycle - Detects if there's a completed session
 * for a given wizard_type + team + cycle (+ optional referenceMonth).
 *
 * Returns the full session (including reflection_data & addendums) if found.
 * Priority: in_progress > completed > none.
 *
 * `referenceMonth` (YYYY-MM) is REQUIRED for monthly rituals inside a
 * quarterly cycle (MBR, MBR-pre). Without it, a session completed in M1
 * of the quarter would be treated as "already completed" in M2, blocking
 * the user from filling the new monthly ritual.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface CompletedSessionData {
  id: string;
  status: string;
  completed_at: string | null;
  reflection_data: Record<string, any> | null;
  addendums: Array<{ text: string; created_at: string; created_by: string }>;
  team_id: string | null;
}

export function useCompletedSessionForCycle(
  wizardType: WizardPersona,
  teamId: string | null | undefined,
  cycleId: string | null | undefined,
  referenceMonth?: string | null,
) {
  const buSupabase = useBuScopedSupabase();
  const { profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.okrs.completedSessionForCycle(
      wizardType,
      teamId,
      cycleId,
      profile?.id,
      referenceMonth ?? null,
    ),
    enabled: !!profile?.id && !!cycleId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!profile?.id || !cycleId) return null;

      // Check for in_progress first
      let ipQuery = buSupabase
        .from('okr_wizard_sessions')
        .select('id, status')
        .eq('started_by', profile.id)
        .eq('wizard_type', wizardType)
        .eq('cycle_id', cycleId)
        .eq('status', 'in_progress');

      if (teamId) ipQuery = ipQuery.eq('team_id', teamId);
      else ipQuery = ipQuery.is('team_id', null);

      if (referenceMonth) {
        ipQuery = ipQuery.eq('reflection_data->data->>referenceMonth', referenceMonth);
      }

      const { data: ipData } = await ipQuery.limit(1).maybeSingle();
      if (ipData) return { type: 'in_progress' as const, session: null };

      // Check for completed
      let cQuery = buSupabase
        .from('okr_wizard_sessions')
        .select('id, status, completed_at, reflection_data, addendums, team_id')
        .eq('started_by', profile.id)
        .eq('wizard_type', wizardType)
        .eq('cycle_id', cycleId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (teamId) cQuery = cQuery.eq('team_id', teamId);
      else cQuery = cQuery.is('team_id', null);

      if (referenceMonth) {
        cQuery = cQuery.eq('reflection_data->data->>referenceMonth', referenceMonth);
      }

      const { data: cData, error } = await cQuery.maybeSingle();
      if (error) throw error;

      if (cData) {
        const addendums = Array.isArray(cData.addendums) ? cData.addendums : [];
        return {
          type: 'completed' as const,
          session: {
            ...cData,
            addendums,
          } as CompletedSessionData,
        };
      }

      return { type: 'none' as const, session: null };
    },
  });

  return {
    sessionState: data?.type ?? 'none',
    completedSession: data?.session ?? null,
    isLoading,
  };
}
