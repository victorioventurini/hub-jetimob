/**
 * useProposalValidation - Validação IA de OKRs em rascunho (QBR Pre)
 *
 * Usa o agente "validador-metodologico-okrs" via edge function
 * okr-construction-review para avaliar OKRs ainda não persistidos.
 *
 * Diferença para useConstructionReview:
 * - Opera sobre dados draft (não busca do banco)
 * - Disparo manual (botão), não automático
 * - Retorna feedback inline para ajustes imediatos
 */

import { useState, useCallback } from 'react';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import type { AiAssessment } from '../types/construction-review';
import type { DraftTeamKr } from '../types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ProposalValidationInput {
  objectiveTitle: string;
  objectiveDescription?: string;
  teamName?: string;
  draftKrs: DraftTeamKr[];
}

export interface ProposalValidationState {
  assessment: AiAssessment | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// HOOK
// ============================================================

export function useProposalValidation() {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const [state, setState] = useState<ProposalValidationState>({
    assessment: null,
    isLoading: false,
    error: null,
  });

  const validate = useCallback(async (input: ProposalValidationInput) => {
    if (!currentBuId || state.isLoading) return;

    setState({ assessment: null, isLoading: true, error: null });

    try {
      const keyResults = input.draftKrs.map(kr => ({
        id: kr.id,
        title: kr.title,
        type: kr.type,
        baseline: kr.baseline,
        target: kr.target,
        unit: kr.unit,
        owner_user_id: kr.owner_user_id,
      }));

      const { data, error } = await buSupabase.functions.invoke('okr-construction-review', {
        body: {
          buId: currentBuId,
          objectiveTitle: input.objectiveTitle,
          objectiveDescription: input.objectiveDescription,
          teamName: input.teamName,
          keyResults,
        },
      });

      if (error) throw error;

      const responseData = data?.data ?? data;
      if (responseData?.assessment) {
        setState({ assessment: responseData.assessment, isLoading: false, error: null });
      } else {
        throw new Error('Resposta inesperada do validador');
      }
    } catch (err) {
      console.error('[useProposalValidation] error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro ao validar';
      setState({
        assessment: null,
        isLoading: false,
        error: errorMsg.includes('non-2xx')
          ? 'Serviço de IA indisponível. Tente novamente.'
          : errorMsg,
      });
    }
  }, [buSupabase, currentBuId, state.isLoading]);

  const reset = useCallback(() => {
    setState({ assessment: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    validate,
    reset,
  };
}
