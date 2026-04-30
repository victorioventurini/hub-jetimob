/**
 * Wizard Types — QBR (Quarterly Business Review)
 *
 * Cobre os 4 ritos do quarter: QBR Pre (líder), QBR Pre C-Level, QBR Meeting
 * e QBR Post. Inclui snapshots imutáveis, drafts e helpers de normalização.
 */

import type {
  TeamCheckinDecision,
  RitualImprovementFeedback,
  KrFinalStateSnapshot,
  RitualAgendaSuggestion,
} from './shared';
import type { DirectiveCategory } from './vocabulary';
import type { MbrKpiSnapshot } from './mbr';
import type {
  DraftTeamKr,
  DraftTeamDependency,
  TeamOkrCreationWizardState,
} from './team-okr-creation';

// ============================================================
// QBR STEPS + ENUMS
// ============================================================

export type QbrPreStep =
  | 'balance'
  | 'kpi-analysis'
  | 'learnings'
  | 'okr-proposal'
  | 'summary';

export type QbrPreCLevelStep =
  | 'system-read'
  | 'quarter-balance'
  | 'strategic-analysis'
  | 'okr-validation'
  | 'directives'
  | 'feedback';

export type QbrMeetingStep =
  | 'opening'
  | 'okr-review'
  | 'decisions'
  | 'commitments'
  | 'feedback'
  | 'closing';

export type QbrPostStep =
  | 'okr-promotion'
  | 'decisions'
  | 'commitments'
  | 'follow-up'
  | 'minutes';

export type QbrApprovalStatus =
  | 'approved'
  | 'approved_with_changes'
  | 'discarded'
  | 'defer';

export type QbrCalibrationFlag =
  | 'too_conservative'
  | 'too_aggressive'
  | 'gap'
  | 'overlap';

// ============================================================
// PROPOSED OBJECTIVE ENTRY (multi-objetivo)
// ============================================================

/**
 * Entrada de objetivo proposto no QBR Pre — suporta múltiplos objetivos por time.
 * Cada entrada contém o objetivo, plano de KRs e KRs rascunho.
 */
export interface ProposedObjectiveEntry {
  /** client-side UUID para tracking do rascunho */
  id: string;
  objective: {
    title: string;
    description: string;
    org_objective_id: string | null;
    cycle_id: string | null;
  };
  krPlan: {
    foundational: number;
    contribution: number;
    enabler: number;
  };
  draftKrs: DraftTeamKr[];
}

/**
 * Normaliza proposedOkrs para o formato de array.
 * Garante backward compatibility com dados antigos (single-objective).
 */
export function normalizeProposedOkrs(
  data:
    | ProposedObjectiveEntry[]
    | Partial<TeamOkrCreationWizardState>
    | undefined
    | null,
): ProposedObjectiveEntry[] {
  if (!data) return [];
  // Already an array
  if (Array.isArray(data)) return data;
  // Old single-objective format
  const old = data as Partial<TeamOkrCreationWizardState>;
  if (old.objective?.title?.trim()) {
    return [
      {
        id: `migrated-${Date.now()}`,
        objective: old.objective,
        krPlan: old.krPlan || { foundational: 1, contribution: 0, enabler: 0 },
        draftKrs: old.draftKrs || [],
      },
    ];
  }
  return [];
}

// ============================================================
// QBR PRE (LÍDER DE TIME)
// ============================================================

/** Snapshot imutável do wizard pré-QBR — segue padrão MbrKpiSnapshot */
export interface QbrPreSnapshot {
  cycleId: string;
  teamId: string;
  submittedAt: string;
  krFinalStates: KrFinalStateSnapshot[];
  kpiSnapshot: MbrKpiSnapshot[];
  kpisToCreate: Array<{
    description: string;
    suggestedScope: string;
    /**
     * @deprecated Onda 4 Fase 5 — Feature de sugestão de KPI descontinuada;
     * campo mantido apenas para compatibilidade com snapshots legados.
     * Será removido após a janela de observação (≥90 dias).
     */
    relatedKrTitle?: string;
  }>;
  learnings: {
    whatWorked: string;
    whatDidntWork: string;
    debts: string;
  };
  proposedOkrs: ProposedObjectiveEntry[];
  dependencies: DraftTeamDependency[];
}

/** Draft data do pré-QBR (líderes de time) */
export interface QbrPreDraftData {
  cycleId: string;
  teamId: string;
  krFinalStates: QbrPreSnapshot['krFinalStates'];
  kpiSnapshots: MbrKpiSnapshot[];
  kpisToCreate: QbrPreSnapshot['kpisToCreate'];
  learnings: QbrPreSnapshot['learnings'];
  proposedOkrs: ProposedObjectiveEntry[];
  dependencies: DraftTeamDependency[];
  decisions: TeamCheckinDecision[];
}

// ============================================================
// QBR PRE C-LEVEL
// ============================================================

/** Snapshot do wizard pré-QBR C-Level */
export interface QbrCLevelSnapshot {
  cycleId: string;
  submittedAt: string;
  systemPatterns: string;
  strategicAnalysis: {
    alignmentPastQuarter: string;
    alignmentNextQuarter: string;
    signalsTeamsMissed: string;
    whatNotToDo: string;
  };
  okrCalibrationFlags: Array<{
    teamId: string;
    flag: QbrCalibrationFlag;
    note: string;
  }>;
  directives: Array<{
    text: string;
    category: DirectiveCategory;
    targetTeamId?: string;
  }>;
  decisions: TeamCheckinDecision[];
  ritualFeedback: RitualImprovementFeedback[];
}

/** Draft data do pré-QBR C-Level */
export interface QbrCLevelDraftData {
  cycleId: string;
  systemPatterns: string;
  strategicAnalysis: QbrCLevelSnapshot['strategicAnalysis'];
  okrCalibrationFlags: QbrCLevelSnapshot['okrCalibrationFlags'];
  directives: QbrCLevelSnapshot['directives'];
  decisions: TeamCheckinDecision[];
  ritualFeedback: RitualImprovementFeedback[];
}

// ============================================================
// QBR MEETING
// ============================================================

/** Checklist de governança do QBR Meeting */
export interface QbrMeetingGovernanceChecklist {
  allTeamsReviewed: boolean;
  orgCoverageClear: boolean;
  decisionsHaveOwners: boolean;
  dependenciesFormalized: boolean;
  feedbackLinkSent: boolean;
}

/**
 * Compromisso transversal entre times (cross-team commitment).
 * Canônico para QBR Meeting e QBR Post; `dependencyId` só é populado no Post
 * quando o compromisso é promovido a `team_dependencies` no banco.
 */
export interface QbrCrossCommitment {
  fromTeamId: string;
  toTeamId: string;
  description: string;
  deadline: string;
  linkedOkrId?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  /** Populado no Post ao formalizar o compromisso como dependência. */
  dependencyId?: string;
}

/**
 * Ajuste estruturado de KR aplicado quando um OKR é aprovado "com mudanças"
 * no QBR Meeting/Post. Canônico — usado também no shape inline de
 * `QbrMeetingSnapshot.approvals[].changes` (forma de array).
 */
export interface QbrKrAdjustment {
  krIndex: number;
  /** Marcador opcional usado no Post para distinguir ajustes vazios. */
  hasAdjustment?: boolean;
  newTitle?: string;
  newTarget?: string;
  newOwnerId?: string;
  newOwnerName?: string;
}

/** Snapshot do wizard QBR Meeting */
export interface QbrMeetingSnapshot {
  cycleId: string;
  conductedAt: string;
  approvals: Array<{
    teamId: string;
    sessionId: string;
    status: QbrApprovalStatus;
    changes?: Partial<TeamOkrCreationWizardState> | QbrKrAdjustment[];
    discardReason?: string;
  }>;
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrCrossCommitment[];
  governanceChecklist: QbrMeetingGovernanceChecklist;
  ritualFeedback: RitualImprovementFeedback[];
  ritualFeedbackSentAt?: string;
  /** Prioridades dos próximos 30 dias por papel */
  nextThirtyDays?: { ceo?: string; coo?: string; cpto?: string };
}

/** Draft data do QBR Meeting */
export interface QbrMeetingDraftData {
  cycleId: string;
  preQbrReportSessionId: string | null;
  approvals: QbrMeetingSnapshot['approvals'];
  currentTeamIndex: number;
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrCrossCommitment[];
  governanceChecklist: QbrMeetingGovernanceChecklist;
  ritualFeedback: RitualImprovementFeedback[];
  /** IDs de KRs org marcadas como "gap intencional" no mapa de cobertura */
  intentionalGaps?: string[];
  /** Prioridades dos próximos 30 dias por papel */
  nextThirtyDays?: { ceo?: string; coo?: string; cpto?: string };
}

// ============================================================
// QBR POST
// ============================================================

/** Checklist de governança do pós-QBR */
export interface QbrPostGovernanceChecklist {
  strategicFocusClear: boolean;
  decisionsHaveOwners: boolean;
  dependenciesFormalized: boolean;
  nextCycleOkrsActive: boolean;
}

/** Snapshot do wizard pós-QBR */
export interface QbrPostSnapshot {
  cycleId: string;
  completedAt: string;
  promotedOkrIds: string[];
  /** Ciclo de destino para promoção dos OKRs */
  destinationCycleId?: string;
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrCrossCommitment[];
  followUpCadence: {
    nextMbrDate?: string;
    firstCheckinDate?: string;
    followUpMeetingDate?: string;
    leadersNotified?: boolean;
  };
  executiveMinutes: string;
  /** Carta de contexto do CEO enviada junto com notificação de OKRs ativos */
  ceoContextMessage?: string;
  governanceChecklist: QbrPostGovernanceChecklist;
}

/** Draft data do pós-QBR */
export interface QbrPostDraftData {
  cycleId: string;
  meetingSessionId: string | null;
  promotedOkrIds: string[];
  /** Ciclo de destino para promoção */
  destinationCycleId?: string;
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrCrossCommitment[];
  followUpCadence: QbrPostSnapshot['followUpCadence'];
  executiveMinutes: string;
  /** Carta de contexto do CEO */
  ceoContextMessage?: string;
  governanceChecklist: QbrPostGovernanceChecklist;
  /** Notas de ajuste por sessionId — para OKRs aprovados "com ajustes" (legacy) */
  adjustmentNotes?: Record<string, string>;
  /** Ajustes estruturados por KR, indexados por sessionId */
  krAdjustments?: Record<string, QbrKrAdjustment[]>;
}
