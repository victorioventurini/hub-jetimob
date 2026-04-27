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
import type {
  KpiForWizardV2,
  KpiInputType,
  KpiConfidenceLevel,
  KpiFrequencyValue,
} from '@/modules/kpis/types';
import { FREQUENCY_DAYS, legacyFrequencyToValue } from '@/modules/kpis/utils/frequency';

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
  // v3.0.0 — metadados opcionais usados nas badges do KPI Gate
  lastInputType?: KpiInputType | null;
  lastConfidence?: KpiConfidenceLevel | null;
  updateFrequency?: KpiFrequencyValue | null;
  deviationPct?: number | null;
}

/**
 * v3.0.0 — Buckets ordenados (6 grupos) usados pelo KpiGateStep para
 * apresentar KPIs em ordem de prioridade decrescente. `teamContext`
 * é colapsado por default no UI.
 */
export type KpiGateBucketId =
  | 'overdue'
  | 'critical'
  | 'guardrailViolated'
  | 'attention'
  | 'healthy'
  | 'teamContext';

export interface KpiGateBucket {
  id: KpiGateBucketId;
  label: string;
  description?: string;
  items: KpiGateItem[];
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
  /**
   * Ação do líder marcada para a pauta (apenas em mode='leader-actions').
   * `discuss_group` = discutir em grupo. `followup_1on1` = follow-up 1:1.
   */
  leaderAction?: 'discuss_group' | 'followup_1on1' | null;
  /** Dias desde o último check-in (para badges de pendência). */
  daysSinceCheckin?: number;
  /** Marca o KR como em risco para destaque visual. */
  isAtRisk?: boolean;
  /** Marca o KR como pendente (sem check-in recente). */
  isPending?: boolean;
}

/**
 * Item de insight gerado pelo sistema/IA — consumido por LeaderInsightsStep.
 * Tipos refletem os HIGHLIGHT_CARD_STYLES centralizados.
 */
export interface LeaderInsightItem {
  id: string;
  type: 'stagnant' | 'blocked' | 'initiative_impact' | 'help_requested' | 'overdue';
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  source: 'system' | 'ai';
  relatedKrId?: string;
  /** Quando true e source='ai', permite descartar via botão. */
  dismissable?: boolean;
}

/**
 * Container do LeaderInsightsStep: insights + lista de IDs descartados.
 */
export interface LeaderInsightsData {
  insights: LeaderInsightItem[];
  dismissedIds: string[];
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
