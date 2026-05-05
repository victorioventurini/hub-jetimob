/**
 * Wizard Types — MBR (Monthly Business Review) + MBR Pre (Leader Prep)
 *
 * Inclui os snapshots imutáveis de KPIs e OKRs e os tipos de governança.
 */

import type { TeamCheckinDecision, RitualImprovementFeedback, RitualAgendaSuggestion } from './shared';
import type { KpiFrequencyValue, KpiInputType } from '@/modules/kpis/types';

// ============================================================
// MBR STEPS
// ============================================================

export type MbrStep =
  | 'panorama'
  | 'kpi-gate'
  | 'kpi-deep-dive'
  | 'team-okrs-overview'
  | 'team-okrs-detail'
  | 'org-okrs'
  | 'decisions'
  | 'qbr-followup'
  | 'evaluation'
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
  /** v3.0.0 — tipo do último input registrado (consolidado/parcial). */
  latestInputType?: 'partial' | 'consolidated' | null;
  /** Direção da meta (necessária pelo `KpiValueEntryForm` em ritos reflexivos). */
  direction?: 'up' | 'down' | null;
  /** Cadência de consolidação (v3.0.0). Necessária para `KpiValueEntryForm`. */
  consolidationFrequency?: KpiFrequencyValue | null;
  /** Cadência de update (v3.0.0). Usada para classificar bucket `overdue`. */
  updateFrequency?: KpiFrequencyValue | null;
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
    /**
     * @deprecated Onda 4 Fase 1 — Resolver via lookup de profiles por `owner_user_id`
     * do KR. Mantido para retrocompat de snapshots gravados.
     */
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
    /**
     * @deprecated Onda 4 Fase 1 — Resolver via lookup de profiles por `owner_user_id`.
     */
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
  /**
   * @deprecated Onda 4 Fase 1 — Resolver via lookup `useTeams` por `teamId`.
   */
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
// PANORAMA CURATION (Abertura Executiva curada por IA)
// ============================================================

/**
 * Estados do rascunho da Abertura Executiva do MBR (curadoria IA + revisão humana).
 * Espelha `WeeklyOpeningState` para manter vocabulário consistente entre ritos.
 */
export type MbrPanoramaCurationState = 'draft' | 'reviewed' | 'approved';
export type MbrPanoramaCurationOrigin = 'ai-curated' | 'manual';

export interface MbrPanoramaCurationTransition {
  state: MbrPanoramaCurationState;
  at: string;
  by: string | null;
}

export interface MbrPanoramaCriticalKpiHighlight {
  kpiId: string;
  headline: string;
  impact: string;
}

export interface MbrPanoramaSuggestedDecision {
  id: string;
  title: string;
  category?: string;
  /** Marca quando o usuário já transferiu para `decisions` (evita duplicar). */
  added?: boolean;
}

/**
 * Curadoria executiva do Step 1 do MBR — produzida pelo agente
 * `curador-orquestrador` (mesmo do Weekly), com insumos mensais.
 * Persistida em `MbrDraftData.panoramaCuration`.
 */
export interface MbrPanoramaCuration {
  state: MbrPanoramaCurationState;
  origin: MbrPanoramaCurationOrigin;
  generatedAt: string | null;
  summary: string;
  criticalKpiHighlights: MbrPanoramaCriticalKpiHighlight[];
  alertsByBlock: {
    performance: string[];
    projetos: string[];
    pessoas: string[];
  };
  suggestedDecisions: MbrPanoramaSuggestedDecision[];
  transitions: MbrPanoramaCurationTransition[];
}

export const EMPTY_MBR_PANORAMA_CURATION: MbrPanoramaCuration = {
  state: 'draft',
  origin: 'manual',
  generatedAt: null,
  summary: '',
  criticalKpiHighlights: [],
  alertsByBlock: { performance: [], projetos: [], pessoas: [] },
  suggestedDecisions: [],
  transitions: [],
};

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
  qbrFollowUpItems: QbrFollowUpItem[];
  /**
   * Curadoria executiva do Step 1 (Abertura Executiva).
   * Opcional para retrocompat com drafts antigos — `MbrPage` hidrata com
   * `EMPTY_MBR_PANORAMA_CURATION` quando ausente.
   */
  panoramaCuration?: MbrPanoramaCuration;
}

// ============================================================
// MBR PRE (LEADER PREP)
// ============================================================

export type MbrPreStep =
  | 'data-validation'
  | 'opening'
  | 'kpi-analysis'
  | 'projects'
  | 'krs'
  | 'highlights'
  | 'next-steps'
  | 'summary'
  /** @deprecated Substituído por 'opening' a partir de 2026-05-02. Mantido para hidratação de drafts antigos. */
  | 'balance';

/** Draft data do pré-MBR (líderes de time) */
export interface MbrPreDraftData {
  cycleId: string;
  teamId: string;
  /**
   * Mês analisado pelo rito (`YYYY-MM`). Sempre um mês fechado — por padrão,
   * o mês imediatamente anterior à data de execução. Pode ser sobreposto pelo
   * usuário via `ReferenceMonthPicker` para refazer/auditar análises passadas.
   */
  referenceMonth: string;
  /**
   * Estado final dos KRs ao fim do mês — mesmo formato de QbrPreSnapshot.
   * Tipado como `unknown[]` aqui para evitar import cíclico com qbr.ts;
   * o consumidor canônico (`MbrPrePage`) refina via `QbrPreSnapshot['krFinalStates']`.
   */
  krFinalStates: Array<{
    krId: string;
    /**
     * @deprecated Onda 4 Fase 1 — Resolver via lookup `useKeyResults` por `krId`.
     * Onda 4 Fase 3: writers param de gravar; opcional para retrocompat.
     */
    krTitle?: string;
    objectiveId: string;
    /**
     * @deprecated Onda 4 Fase 1 — Resolver via lookup `useObjectives` por `objectiveId`.
     * Onda 4 Fase 3: writers param de gravar; opcional para retrocompat.
     */
    objectiveTitle?: string;
    state: string;
    finalProgress: number;
    paceStatus: string;
    /**
     * `true` quando o KR pertence a um objetivo de OUTRO time, mas o time
     * analisado consta como contribuidor (via `v_team_contributed_okrs`).
     * Default/ausente = KR de objetivo do próprio time.
     */
    isContributed?: boolean;
  }>;
  kpiSnapshots: MbrKpiSnapshot[];
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
  highlights: { accelerated: string; blocked: string; needsDecision: string };
  nextSteps: { focus: string; prioritizedItems: string[]; crossDependencies: string[] };
  decisions: TeamCheckinDecision[];
  /**
   * Justificativas de KPIs fora da meta (RAG ≠ verde) — chave: kpiId.
   * Reflexivo: o líder explica o desvio sem alterar o valor do KPI.
   */
  kpiJustifications: Record<string, string>;
  /**
   * Razões pelas quais um KPI está sem dados — chave: kpiId.
   * Obrigatório no rito reflexivo quando o KPI está em bucket `no_data`.
   */
  kpiNoDataReasons?: Record<string, string>;
  /**
   * @deprecated v3.31.1 — não há mais UI no Pré-MBR para registrar update inline
   * de valor de KPI durante o rito (o fluxo SSOT é o `KpiValueEntryForm` em
   * `/kpis` ou no Check-in Individual). Mantido OPCIONAL para retrocompat de
   * leitura de sessões antigas; novos drafts não escrevem este campo.
   * Re-introduzir somente via flag `allowInlineValueEntry` no `KpiGateStep`
   * (ticket separado) reutilizando o SSOT — JAMAIS duplicar formulário.
   */
  kpiOutdatedUpdates?: Record<string, {
    newValue: number;
    referenceDate: string;
    inputType: KpiInputType;
    notes?: string;
    submittedAt: string;
  }>;
  /**
   * Justificativas de projetos/milestones atrasados.
   * Reflexivo: o líder explica o atraso sem mexer no status do milestone.
   */
  projectJustifications: {
    projects: Record<string, string>;
    milestones: Record<string, string>;
  };
  /**
   * Justificativas de KRs fora da meta (severidade `warning`/`critical`) — chave: krId.
   * Reflexivo: o líder explica o desvio sem registrar check-in nem alterar `current_value`.
   */
  krJustifications: Record<string, string>;
  /** Sugestões de pauta para o MBR coletadas ao longo do wizard (até 3 prioritárias). */
  agendaSuggestions: RitualAgendaSuggestion[];
  /** Análise mensal IA gerada na abertura (cache no draft, regerável sob demanda). */
  monthAnalysis?: MbrPreMonthAnalysis | null;
}

/** Análise mensal IA do Pré-MBR (output do agente analista-estrategico). */
export interface MbrPreMonthAnalysis {
  generatedAt: string;
  origin: 'ai-generated' | 'manual';
  referenceMonth: string; // YYYY-MM
  summary: string;
  highlights: Array<{ title: string; detail: string }>;
  offenders: Array<{ title: string; detail: string }>;
  risks: Array<{ title: string; detail: string }>;
  recommendations: string[];
}

// ============================================================
// MBR PRE → MBR (consumo agregado)
// ============================================================

/** Addendum vinculado a uma sessão `mbr-pre` (formato canônico do AddendumBadge) */
export interface MbrPreSubmissionAddendum {
  text: string;
  created_at: string;
  created_by: string;
}

/**
 * Submissão `mbr-pre` consolidada de UM time, no mês de referência do MBR.
 * Derivada de `okr_wizard_sessions.reflection_data` + `okr_wizard_addendums`.
 * **NÃO** persistida no draft do MBR — sempre re-derivada via hook.
 */
export interface MbrPreTeamSubmission {
  sessionId: string;
  teamId: string;
  submittedAt: string;
  submittedBy: string | null;
  /**
   * @deprecated Onda 4 Fase 1 — Resolver via lookup de profiles por `submittedBy`.
   */
  submittedByName: string | null;
  highlights: MbrPreDraftData['highlights'];
  nextSteps: MbrPreDraftData['nextSteps'];
  kpisToCreate: MbrPreDraftData['kpisToCreate'];
  krFinalStates: MbrPreDraftData['krFinalStates'];
  addendums: MbrPreSubmissionAddendum[];
  /** KPI snapshots congelados pelo líder no Pré-MBR (com impactAssessment etc). */
  kpiSnapshots: MbrPreDraftData['kpiSnapshots'];
  /** Justificativas de KPI fora da meta (kpiId → texto). */
  kpiJustifications: MbrPreDraftData['kpiJustifications'];
  /** Razões para KPI sem dados (kpiId → texto). */
  kpiNoDataReasons: NonNullable<MbrPreDraftData['kpiNoDataReasons']>;
  /** @deprecated v3.31.1 — ver `MbrPreDraftData.kpiOutdatedUpdates`. */
  kpiOutdatedUpdates: NonNullable<MbrPreDraftData['kpiOutdatedUpdates']>;
  /** Justificativas de projetos/milestones atrasados. */
  projectJustifications: MbrPreDraftData['projectJustifications'];
  /** Justificativas de KRs fora da meta (krId → texto). */
  krJustifications: MbrPreDraftData['krJustifications'];
  /** Sugestões de pauta para o MBR. */
  agendaSuggestions: MbrPreDraftData['agendaSuggestions'];
  /** Análise mensal IA gerada na abertura. */
  monthAnalysis: MbrPreMonthAnalysis | null;
  /** Decisões registradas durante o Pré-MBR. */
  decisions: MbrPreDraftData['decisions'];
}
