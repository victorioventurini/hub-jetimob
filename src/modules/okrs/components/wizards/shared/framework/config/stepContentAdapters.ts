/**
 * Step Content Adapters — tradutores entre contexto específico e formato genérico.
 *
 * Cada componente do framework consome um formato padronizado. Os adapters
 * vivem aqui como funções puras: recebem o estado completo do rito (ex:
 * `MbrDraftData`, `LeaderPrepWizardState`) e produzem o shape esperado
 * pelo componente genérico.
 *
 * Não importar nada de UI aqui. Apenas data → data.
 */

import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// SHARED SHAPES (contratos consumidos pelo framework)
// ============================================================

export interface BalanceContent {
  /** Texto narrativo do balanço (markdown leve) */
  narrative: string;
  /** Indicadores resumidos exibidos como chips (opcional) */
  highlights?: Array<{ id: string; label: string; value?: string }>;
}

export interface KpiGateItem {
  id: string;
  name: string;
  status: 'green' | 'amber' | 'red' | 'unknown';
  currentValue?: string;
  target?: string;
  /** Quando true, o KPI está em alerta e precisa de decisão para liberar gate */
  requiresDecision: boolean;
  resolved?: boolean;
}

export interface KrsItem {
  id: string;
  title: string;
  objectiveTitle?: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'completed' | 'stagnant' | 'unknown';
  progress: number;
  ownerName?: string | null;
  attentionReason?: string;
  reviewed?: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'done' | 'unknown';
  health?: 'green' | 'amber' | 'red';
  ownerName?: string | null;
  teamCount?: number;
}

export interface InitiativeItem {
  id: string;
  title: string;
  status: 'planned' | 'in-progress' | 'done' | 'blocked' | 'unknown';
  ownerName?: string | null;
  linkedKrTitle?: string | null;
}

export interface HighlightItem {
  id: string;
  type: 'accelerated' | 'blocked' | 'attention' | 'worked' | 'didnt-work' | 'debt';
  title: string;
  description?: string;
  relatedId?: string;
}

// ============================================================
// DECISIONS — agrupamento por sourceStep
// ============================================================

export interface DecisionsBySourceStep {
  sourceStep: string;
  count: number;
  decisions: TeamCheckinDecision[];
}

/**
 * Agrupa decisões pelo `sourceStep` para renderização consolidada
 * no `DecisionsStep`. Decisões sem `sourceStep` definido vão para
 * o bucket `__unsourced__`.
 */
export function groupDecisionsBySourceStep(
  decisions: TeamCheckinDecision[],
): DecisionsBySourceStep[] {
  const buckets = new Map<string, TeamCheckinDecision[]>();
  for (const d of decisions) {
    const key = d.sourceStep ?? '__unsourced__';
    const arr = buckets.get(key);
    if (arr) arr.push(d);
    else buckets.set(key, [d]);
  }
  return Array.from(buckets.entries()).map(([sourceStep, list]) => ({
    sourceStep,
    count: list.length,
    decisions: list,
  }));
}
