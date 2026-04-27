/**
 * Wizard Types — MBR (Monthly Business Review) + MBR Pre (Leader Prep)
 *
 * Inclui os snapshots imutáveis de KPIs e OKRs e os tipos de governança.
 */

import type { TeamCheckinDecision, RitualImprovementFeedback } from './shared';

// ============================================================
// MBR STEPS
// ============================================================

export type MbrStep =
  | 'panorama'
  | 'kpi-gate'
  | 'team-okrs-overview'
  | 'team-okrs-detail'
  | 'org-okrs'
  | 'decisions'
  | 'qbr-followup'
  | 'closing';

export type MbrDecisionSourceStep =
  | 'panorama'
  | 'kpi-gate'
  | 'team-okrs-overview'
  | 'team-okrs-detail'
  | 'org-okrs'
  | 'decisions'
  | 'qbr-followup'
  | 'closing';

// ============================================================
// SNAPSHOTS IMUTÁVEIS
// ============================================================

/** KPI snapshot imutável — congelado ao iniciar o MBR */
export interface MbrKpiSnapshot {
  kpiId: string;
  name: string;
  currentValue: number | null;
  previousValue: number | null;
  target: number | null;
  ragStatus: string;
  variationVsLastMonth: number | null;
  variationVsTarget: number | null;
  requiresStrategicDecision: boolean;
  impactAssessment?: string;
  /** Unidade de medida do KPI (ex: '%', 'R$', 'Número') */
  unit?: string;
  /** Data do último valor registrado (ISO string) */
  lastValueAt?: string | null;
  /** Escopo do KPI: org, area ou team */
  scope?: 'org' | 'area' | 'team';
  areaId?: string | null;
  areaName?: string | null;
  areaColor?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  /** v3.0.0 — tipo do último input registrado (consolidado/projeção). */
  latestInputType?: 'projection' | 'consolidated' | null;
  /** v3.0.0 — confidence do último input registrado. */
  latestConfidence?: 'high' | 'medium' | 'low' | null;
}

/** OKR organizacional snapshot */
export interface MbrOrgOkrSnapshot {
  objectiveId: string;
  title: string;
  progress: number;
  status: string;
  trend: 'improving' | 'stable' | 'declining';
  remainsStrategicPriority: boolean;
  keyResults: Array<{
    krId: string;
    title: string;
    progress: number;
    status: string;
    ownerName: string | null;
    baseline: number;
    current: number;
    target: number;
    direction: 'up' | 'down';
    unit: string;
    lastCheckinAt: string | null;
  }>;
}

/** Snapshot de OKRs de um time para o MBR */
export interface MbrTeamOkrObjectiveSnapshot {
  objectiveId: string;
  title: string;
  progress: number;
  status: string;
  krCount: number;
  krsAtRisk: number;
  krsStagnant: number;
  trend: 'improving' | 'stable' | 'declining';
  keyResults: Array<{
    krId: string;
    title: string;
    progress: number;
    status: string;
    ownerName: string | null;
    baseline: number;
    current: number;
    target: number;
    direction: 'up' | 'down';
    unit: string;
    lastCheckinAt: string | null;
  }>;
}

export interface MbrTeamOkrSnapshot {
  teamId: string;
  teamName: string;
  objectives: MbrTeamOkrObjectiveSnapshot[];
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'risk';
  reviewed: boolean;
}

// ============================================================
// GOVERNANCE / FOLLOW-UP
// ============================================================

/** Checklist de governança do MBR (dinâmico — cada item habilitado por condição) */
export interface MbrGovernanceChecklist {
  strategicFocusClear: boolean;
  nextStepsHaveOwners: boolean;
  nonPrioritiesClear: boolean;
  communicateInAllHands: boolean;
  /** Dynamic items — MBR v1.2 */
  kpiGateClear: boolean;
  allTeamsReviewed: boolean;
  orgOkrsVerified: boolean;
  decisionsHaveOwner: boolean;
  qbrFollowUpAddressed: boolean;
  nextMbrScheduled: boolean;
}

/** QBR Follow-up item tracked in MBR */
export interface QbrFollowUpItem {
  id: string;
  text: string;
  category: string;
  owner?: { id: string; name: string };
  deadline?: string | null;
  resolved: boolean;
  sourceType: 'decision' | 'commitment';
  fromTeam?: string;
  toTeam?: string;
}

// ============================================================
// MBR DRAFT DATA
// ============================================================

/** Draft data completo do MBR */
export interface MbrDraftData {
  /** YYYY-MM */
  referenceMonth: string;
  kpiSnapshots: MbrKpiSnapshot[];
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  currentTeamIndex: number;
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  decisions: TeamCheckinDecision[];
  checklist: MbrGovernanceChecklist;
  ritualFeedback: RitualImprovementFeedback[];
  previousMbrPendingItems: TeamCheckinDecision[];
  qbrFollowUpItems: QbrFollowUpItem[];
}

// ============================================================
// MBR PRE (LEADER PREP)
// ============================================================

export type MbrPreStep =
  | 'balance'
  | 'kpi-analysis'
  | 'highlights'
  | 'next-steps'
  | 'summary';

/** Draft data do pré-MBR (líderes de time) */
export interface MbrPreDraftData {
  cycleId: string;
  teamId: string;
  /**
   * Estado final dos KRs ao fim do mês — mesmo formato de QbrPreSnapshot.
   * Tipado como `unknown[]` aqui para evitar import cíclico com qbr.ts;
   * o consumidor canônico (`MbrPrePage`) refina via `QbrPreSnapshot['krFinalStates']`.
   */
  krFinalStates: Array<{
    krId: string;
    krTitle: string;
    objectiveId: string;
    objectiveTitle: string;
    state: string;
    finalProgress: number;
    paceStatus: string;
  }>;
  kpiSnapshots: MbrKpiSnapshot[];
  zombieCandidates: string[];
  kpisToCreate: Array<{
    description: string;
    suggestedScope: string;
    relatedKrTitle: string;
  }>;
  highlights: { accelerated: string; blocked: string; needsDecision: string };
  nextSteps: { focus: string; prioritizedItems: string[]; crossDependencies: string[] };
  decisions: TeamCheckinDecision[];
}
