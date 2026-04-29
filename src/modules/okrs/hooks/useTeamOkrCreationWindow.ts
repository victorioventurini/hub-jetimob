/**
 * useTeamOkrCreationWindow — Janela de disponibilidade do rito "Criação de OKRs do Time"
 *
 * O rito só está aberto quando existe pelo menos um ciclo trimestral em status
 * `planning` na BU ativa. Esse status é definido ao final do Pós-QBR, abrindo o
 * próximo quarter para planejamento.
 *
 * BU isolation é herdada de `useActiveCycle` (já filtra por currentBuId).
 */

import { useMemo } from 'react';
import { useActiveCycle, type CycleWithStatus } from './useActiveCycle';

export interface TeamOkrCreationWindow {
  /** True quando há ao menos um quarter em planning na BU ativa */
  isOpen: boolean;
  /** Quarter(es) em planejamento (para mensagens amigáveis) */
  planningQuarters: CycleWithStatus[];
  /** Texto curto do(s) quarter(es) em planning, ex.: "Q3 2026" */
  planningHint: string | null;
  isLoading: boolean;
}

export function useTeamOkrCreationWindow(): TeamOkrCreationWindow {
  const { planningCycles, isLoading } = useActiveCycle();

  const planningQuarters = useMemo(
    () => (planningCycles ?? []).filter((c) => c.type === 'quarter'),
    [planningCycles],
  );

  const planningHint = useMemo(() => {
    if (planningQuarters.length === 0) return null;
    return planningQuarters.map((c) => c.name).join(', ');
  }, [planningQuarters]);

  return {
    isOpen: planningQuarters.length > 0,
    planningQuarters,
    planningHint,
    isLoading,
  };
}
