/**
 * MBR v2 — Tipos
 *
 * Rito mensal organizado por OBJETIVOS ORGANIZACIONAIS (não por times),
 * com tempo proporcional à severidade e KPI Gate de 4 caminhos canônicos.
 *
 * Convive em paralelo com o MBR v1 (`wizard_type='mbr'`). Persistido em
 * `okr_wizard_sessions` com `wizard_type='mbr-v2'` e `structure_version='v4'`.
 *
 * Consome o Pré-MBR v1 atual SEM ALTERAÇÕES (decisão 2026-05-04).
 */

import type {
  TeamCheckinDecision,
  RitualImprovementFeedback,
} from './shared';
import type { MbrPanoramaCuration } from './mbr';

// ============================================================
// STEPS
// ============================================================

export type MbrV2Step =
  | 'opening-executive'
  | 'kpi-gate'
  | 'objectives-overview'
  | 'objective-detail'
  | 'loose-items'
  | 'carry-over'
  | 'decisions'
  | 'evaluation'
  | 'closing';

export const MBR_V2_STEP_ORDER: MbrV2Step[] = [
  'opening-executive',
  'kpi-gate',
  'objectives-overview',
  'objective-detail',
  'loose-items',
  'carry-over',
  'decisions',
  'evaluation',
  'closing',
];

// ============================================================
// SEVERIDADE POR OBJETIVO ORGANIZACIONAL
// ============================================================

export type MbrV2ObjectiveSeverity = 'high' | 'medium' | 'low';

/** Tempo recomendado de discussão por nível de severidade (minutos). */
export const MBR_V2_TIME_BUDGET_MIN: Record<MbrV2ObjectiveSeverity, number> = {
  high: 28,
  medium: 15,
  low: 3,
};

export interface MbrV2ObjectiveAnalysis {
  objectiveId: string;
  /** Nome em cache no draft (denormalizado para imutabilidade do snapshot). */
  title: string;
  severity: MbrV2ObjectiveSeverity;
  /** Tempo orçado em minutos (default por severidade, ajustável pelo líder). */
  timeBudgetMin: number;
  /** Razões objetivas que justificaram o nível de severidade. */
  drivers: string[];
  /** Marcado quando o objetivo foi discutido em algum sub-step. */
  discussed: boolean;
  /** Severidade ajustada manualmente pelo líder (sobrescreve a calculada). */
  manualSeverityOverride?: MbrV2ObjectiveSeverity | null;
}

// ============================================================
// KPI GATE — 4 caminhos canônicos
// ============================================================

export type MbrV2KpiGateResolutionPath =
  | 'immediate_decision'      // decidir agora no rito
  | 'delegated_investigation' // delegar investigação com responsável + prazo
  | 'analyzed'                // analisado/contextualizado, sem ação adicional
  | 'blocked';                // bloqueio externo, registrar e seguir

export interface MbrV2KpiGateResolution {
  kpiId: string;
  path: MbrV2KpiGateResolutionPath;
  notes?: string;
  ownerProfileId?: string | null;
  dueDate?: string | null;
}

// ============================================================
// CARRY-OVER (decisões anteriores com status obrigatório)
// ============================================================

export type MbrV2CarryOverStatus =
  | 'concluded'
  | 'in_progress'
  | 'replanned'
  | 'cancelled';

export interface MbrV2CarryOverItem {
  decisionId: string;
  /** Snapshot textual para imutabilidade. */
  text: string;
  status: MbrV2CarryOverStatus;
  notes?: string;
}

// ============================================================
// ITENS AVULSOS
// ============================================================

export interface MbrV2LooseItem {
  id: string;
  title: string;
  detail?: string;
  /** TeamId opcional — quando vier de sugestão do Pré-MBR. */
  sourceTeamId?: string | null;
  addressed: boolean;
}

// ============================================================
// CHECKLIST DE ENCERRAMENTO
// ============================================================

export interface MbrV2ClosingChecklist {
  decisionsHaveOwners: boolean;
  carryOverFullyStatused: boolean;
  evaluationCollected: boolean;
  nextMbrScheduled: boolean;
}

// ============================================================
// DRAFT DATA
// ============================================================

export interface MbrV2DraftData {
  /** YYYY-MM — mês fechado analisado pelo rito. */
  referenceMonth: string;
  /** Curadoria executiva da abertura (reusa o tipo do MBR v1). */
  panoramaCuration: MbrPanoramaCuration;
  /** Resoluções escolhidas no KPI Gate. */
  kpiGateResolutions: MbrV2KpiGateResolution[];
  /** Análises por objetivo organizacional, ordenadas por severidade. */
  objectiveAnalyses: MbrV2ObjectiveAnalysis[];
  /** Índice do objetivo atualmente em discussão (Detail step). */
  currentObjectiveIndex: number;
  /** Itens avulsos discutidos. */
  looseItems: MbrV2LooseItem[];
  /** Status das decisões do MBR anterior. */
  carryOver: MbrV2CarryOverItem[];
  /** Decisões formais (output canônico). */
  decisions: TeamCheckinDecision[];
  /** Checklist final. */
  checklist: MbrV2ClosingChecklist;
  /** Feedback opcional sobre o rito (campo livre, além da avaliação anônima). */
  ritualFeedback: RitualImprovementFeedback[];
}
