/**
 * useDecisionsAggregator
 *
 * Agrupa decisões registradas no rito pelo `sourceStep` para exibição
 * consolidada no `DecisionsStep`. Também expõe contagens úteis para
 * badges visuais em headers de outros steps.
 *
 * Regra ubíqua: como TODOS os steps ativos do framework registram
 * decisões via `InlineDecisionInput`, este hook é o ponto único onde
 * o `DecisionsStep` consolida tudo.
 */

import { useMemo } from 'react';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import {
  groupDecisionsBySourceStep,
  type DecisionsBySourceStep,
} from '../config/stepContentAdapters';

export interface UseDecisionsAggregatorReturn {
  /** Decisões agrupadas por sourceStep (excluindo o step corrente) */
  fromOtherSteps: DecisionsBySourceStep[];
  /** Decisões registradas no step corrente (para o `DecisionsStep` mostrar como "novas") */
  fromCurrentStep: TeamCheckinDecision[];
  /** Total de decisões no rito inteiro */
  totalCount: number;
  /** Mapa rápido stepId → count (para badges em headers) */
  countsByStep: Record<string, number>;
}

export function useDecisionsAggregator(
  decisions: TeamCheckinDecision[],
  currentStepId: string,
): UseDecisionsAggregatorReturn {
  return useMemo(() => {
    const grouped = groupDecisionsBySourceStep(decisions);
    const fromCurrentStep = grouped.find((g) => g.sourceStep === currentStepId)?.decisions ?? [];
    const fromOtherSteps = grouped.filter((g) => g.sourceStep !== currentStepId);
    const countsByStep: Record<string, number> = {};
    for (const g of grouped) countsByStep[g.sourceStep] = g.count;
    return {
      fromOtherSteps,
      fromCurrentStep,
      totalCount: decisions.length,
      countsByStep,
    };
  }, [decisions, currentStepId]);
}
