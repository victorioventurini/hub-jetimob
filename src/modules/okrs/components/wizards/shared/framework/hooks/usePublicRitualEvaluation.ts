/**
 * usePublicRitualEvaluation
 *
 * Hooks usados na página pública (`/p/r/:shortCode`) — SEM autenticação.
 * Usam `globalClient` (PRE-BU) e RPCs `SECURITY DEFINER` que validam
 * o short-code internamente.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase as globalClient } from '@/integrations/supabase/globalClient';
import { ritualEvaluationKeys } from '@/lib/queryKeys/ritualEvaluation';

export interface PublicEvaluationForm {
  sessionId: string;
  ritualLabel: string;
  wizardType: string;
  showWhatWorked: boolean;
  isOpen: boolean;
}

export function usePublicRitualEvaluationForm(shortCode: string | null | undefined) {
  return useQuery({
    queryKey: ritualEvaluationKeys.form(shortCode ?? null),
    queryFn: async (): Promise<PublicEvaluationForm | null> => {
      if (!shortCode) return null;
      const { data, error } = await globalClient.rpc(
        'get_public_ritual_evaluation_form',
        { p_short_code: shortCode },
      );
      if (error) throw error;
      const row = (data?.[0] ?? null) as
        | {
            session_id: string;
            ritual_label: string;
            wizard_type: string;
            show_what_worked: boolean;
            is_open: boolean;
          }
        | null;
      if (!row) return null;
      return {
        sessionId: row.session_id,
        ritualLabel: row.ritual_label,
        wizardType: row.wizard_type,
        showWhatWorked: !!row.show_what_worked,
        isOpen: !!row.is_open,
      };
    },
    enabled: !!shortCode,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export interface SubmitEvaluationInput {
  shortCode: string;
  scoreValue: number;
  scoreQuality: number;
  scoreDecisions: number;
  scoreTime: number;
  changeOneThing: string;
  whatWorked?: string;
  /** Fingerprint local (NÃO envia identidade — apenas para rate-limit anti-bot) */
  clientFingerprint?: string;
}

export function useSubmitRitualEvaluation() {
  return useMutation({
    mutationFn: async (input: SubmitEvaluationInput) => {
      const { data, error } = await globalClient.rpc('submit_ritual_evaluation', {
        p_short_code: input.shortCode,
        p_score_value: input.scoreValue,
        p_score_quality: input.scoreQuality,
        p_score_decisions: input.scoreDecisions,
        p_score_time: input.scoreTime,
        p_change_one_thing: input.changeOneThing,
        p_what_worked: input.whatWorked ?? null,
        p_client_fingerprint: input.clientFingerprint ?? null,
      });
      if (error) throw error;
      return data as { ok: boolean };
    },
  });
}
