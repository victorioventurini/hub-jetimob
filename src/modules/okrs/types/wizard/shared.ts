/**
 * Wizard Types — Shared
 *
 * Tipos transversais usados por múltiplos wizards (decisões, threads,
 * checklists). Mantidos isolados para evitar import cíclico entre as
 * personas que os referenciam (collaborator, team-checkin, mbr, qbr, weekly).
 */

import type { DecisionCategory } from './vocabulary';

// ============================================================
// TEAM CHECKIN DECISION SOURCE STEPS
// ============================================================

export type TeamCheckinDecisionSourceStep =
  | 'opening'
  | 'kr-review'
  | 'initiatives'
  | 'decisions'
  | 'panorama'
  | 'kpi-gate'
  | 'team-okrs-overview'
  | 'team-okrs-detail'
  | 'org-okrs'
  | 'closing'
  | 'mbr-pre-balance'
  | 'mbr-pre-kpi'
  | 'mbr-pre-highlights'
  | 'mbr-pre-next-steps'
  | 'qbr-balance'
  | 'qbr-kpi-analysis'
  | 'qbr-learnings'
  | 'qbr-okr-proposal'
  | 'qbr-clevel-system-read'
  | 'qbr-clevel-strategic'
  | 'qbr-clevel-okr-validation'
  | 'qbr-clevel-directives'
  | 'qbr-meeting-opening'
  | 'qbr-meeting-okr-review'
  | 'qbr-meeting-decisions'
  | 'qbr-meeting-commitments'
  | 'qbr-meeting-closing'
  | 'qbr-post-promotion'
  | 'qbr-post-decisions'
  | 'qbr-post-commitments'
  | 'qbr-post-followup'
  | 'qbr-post-minutes'
  | 'pre-weekly-sources'
  | 'pre-weekly-pauta'
  | 'pre-weekly-pessoas'
  | 'weekly-executive-opening'
  | 'weekly-priorities'
  | 'weekly-people'
  | 'weekly-closing';

// ============================================================
// DECISION THREAD
// ============================================================

/**
 * Mensagem individual na thread de acompanhamento de uma decisão/registro.
 */
export interface DecisionThreadMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ============================================================
// TEAM CHECKIN DECISION (compartilhado por todos os ritos)
// ============================================================

export interface TeamCheckinDecision {
  id: string;
  text: string;
  category: DecisionCategory;
  sourceStep?: TeamCheckinDecisionSourceStep;
  owner?: {
    id: string;
    name: string;
  };
  deadline?: string | null; // ISO date format
  /** ID da diretiva C-Level relacionada (QBR Meeting Step 3) */
  relatedDirectiveId?: string;
  /** Dados de resolução — preenchidos ao marcar como concluído */
  resolvedAt?: string;
  resolvedBy?: { id: string; name: string };
  resolutionNote?: string;
  /** Thread de mensagens de acompanhamento (JSONB) */
  thread?: DecisionThreadMessage[];
  /**
   * v3.0.0 — Metadata estruturada para auditoria. Ex: decisões disparadas
   * pelo KPI Gate gravam `{ source: 'kpi_gate', kpi_id, kpi_input_type,
   * kpi_confidence, kpi_rag_status }` (kpi_input_type ∈ partial|consolidated).
   * Campo livre (jsonb), sem schema rígido.
   */
  metadata?: Record<string, unknown>;
}

// ============================================================
// IMPROVEMENT FEEDBACK (rituais)
// ============================================================

/** Feedback anônimo sobre melhoria do rito */
export interface RitualImprovementFeedback {
  id: string;
  rating: number;
  text: string;
  status: 'pending' | 'implement' | 'evaluated' | 'discarded';
  createdAt: string;
}

// ============================================================
// CANONICAL KR / KPI SNAPSHOTS (Onda 3 — Fase 3)
// ============================================================

/**
 * Snapshot do estado final de um KR ao fechar um ciclo (usado por QBR Pre).
 * Extraído do shape inline para permitir reuso entre ritos sem duplicação.
 */
export interface KrFinalStateSnapshot {
  krId: string;
  /**
   * @deprecated Onda 4 Fase 1 — Resolver via lookup `useKeyResults` por `krId`.
   * Mantido obrigatório para retrocompat de snapshots gravados; readers devem
   * preferir o nome atual via join, com fallback para este campo.
   */
  krTitle: string;
  objectiveId: string;
  /**
   * @deprecated Onda 4 Fase 1 — Resolver via lookup `useObjectives` por `objectiveId`.
   * Mantido obrigatório para retrocompat de snapshots gravados.
   */
  objectiveTitle: string;
  /** KrState from useKrStateInsights */
  state: string;
  finalProgress: number;
  paceStatus: string;
}

/**
 * Alias canônico para snapshots de KPI usados em qualquer rito.
 * Re-exportado de `./mbr` (definição original) para evitar import cíclico.
 * Use `KpiRitualSnapshot` em código novo; `MbrKpiSnapshot` é mantido como
 * legado para retrocompat de imports antigos e snapshots históricos.
 */
export type { MbrKpiSnapshot as KpiRitualSnapshot } from './mbr';
