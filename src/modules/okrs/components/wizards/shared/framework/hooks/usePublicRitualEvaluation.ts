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
import {
  ALL_EVALUATION_DIMENSIONS,
  type EvaluationDimensionKey,
} from '@/modules/okrs/components/wizards/shared/framework/config/evaluationConfig';

export interface PublicEvaluationForm {
  sessionId: string;
  ritualLabel: string;
  wizardType: string;
  showWhatWorked: boolean;
  isOpen: boolean;
  /** Dimensões coletadas; default = todas (compat com sessões antigas) */
  dimensions: EvaluationDimensionKey[];
}

const DIMENSION_SET = new Set<EvaluationDimensionKey>(ALL_EVALUATION_DIMENSIONS);

function normalizeDimensions(input: unknown): EvaluationDimensionKey[] {
  if (!Array.isArray(input) || input.length === 0) return ALL_EVALUATION_DIMENSIONS;
  const filtered = input.filter(
    (k): k is EvaluationDimensionKey => typeof k === 'string' && DIMENSION_SET.has(k as EvaluationDimensionKey),
  );
  return filtered.length > 0 ? filtered : ALL_EVALUATION_DIMENSIONS;
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
            dimensions?: string[] | null;
          }
        | null;
      if (!row) return null;
      return {
        sessionId: row.session_id,
        ritualLabel: row.ritual_label,
        wizardType: row.wizard_type,
        showWhatWorked: !!row.show_what_worked,
        isOpen: !!row.is_open,
        dimensions: normalizeDimensions(row.dimensions),
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
  /** Opcional — variantes enxutas (ex.: All Hands) enviam null */
  scoreQuality?: number | null;
  /** Opcional — variantes enxutas (ex.: All Hands) enviam null */
  scoreDecisions?: number | null;
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
        p_score_quality: input.scoreQuality ?? null,
        p_score_decisions: input.scoreDecisions ?? null,
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
