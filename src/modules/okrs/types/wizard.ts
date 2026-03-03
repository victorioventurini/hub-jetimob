/**
 * Wizard Types - Sistema de Wizards de Check-in de OKRs
 * 
 * 5 Personas distintas:
 * - collaborator: Colaborador (sexta-feira) - KRs atribuídos
 * - leader-prep: Líder (segunda, pré-reunião) - Preparação
 * - team-checkin: Check-in Coletivo do Time - Durante reunião
 * - managers-checkin: Check-in de Gestores - C-Level + líderes de área
 * - clevel-checkin: Check-in C-Level - Direção estratégica
 */

import type { VicAgentSlug, VicActionContext, VicContext } from '@/modules/vic/types';
import type { WizardKr } from '../hooks/useTeamPendingKrs';

// ============================================================
// WIZARD PERSONAS
// ============================================================

export type WizardPersona = 
  | 'collaborator' 
  | 'leader-prep' 
  | 'team-checkin' 
  | 'managers-checkin' 
  | 'clevel-checkin'
  | 'team-okr-creation'
  | 'team-kr-creation'
  | 'mbr';

// ============================================================
// STEP CONFIG
// ============================================================

export interface WizardStepConfig {
  id: string;
  label: string;
  shortLabel: string;
  description?: string;
  optional?: boolean;
}

export interface WizardConfig {
  persona: WizardPersona;
  title: string;
  description: string;
  steps: WizardStepConfig[];
  aiAgents: VicAgentSlug[];
}

// ============================================================
// VIC INSIGHTS
// ============================================================

export type VicInsightType = 'question' | 'insight' | 'alert' | 'suggestion';
export type VicInsightPriority = 'low' | 'medium' | 'high';

export interface VicInsight {
  id: string;
  type: VicInsightType;
  content: string;
  priority: VicInsightPriority;
  source: VicAgentSlug;
  context?: string;
  dismissed?: boolean;
}

export interface VicGuidingQuestion {
  id: string;
  question: string;
  context?: string;
  source: VicAgentSlug;
}

// ============================================================
// COLLABORATOR WIZARD
// ============================================================

export interface CollaboratorCheckinResult {
  krId: string;
  krTitle: string;
  objectiveTitle: string;
  previousValue: number;
  newValue: number;
  confidence: 'high' | 'medium' | 'low';
  comment?: string;
  skipped: boolean;
  blocker?: string;
}

export interface CollaboratorReflection {
  impactSummary?: string;
  helpNeeded?: string;
}

/**
 * Resultado de check-in de KPI no wizard de colaborador
 * Segue padrão fail-safe: KPIs são instrumentos auditáveis, mas nunca bloqueiam o fluxo
 */
export interface KpiCheckinResult {
  kpiId: string;
  kpiName: string;
  previousValue: number | null;
  newValue: number;
  referenceDate: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  skipped: boolean;
}

export interface CollaboratorWizardState {
  krs: WizardKr[];
  results: CollaboratorCheckinResult[];
  kpiResults: KpiCheckinResult[];
  reflection: CollaboratorReflection;
  initiativesMarkedAtRisk: string[];
}

// ============================================================
// LEADER PREP WIZARD
// ============================================================

export type KrActionType = 'discuss_group' | 'followup_1on1' | 'at_risk' | 'needs_attention';

export interface KrAction {
  krId: string;
  actionType: KrActionType;
  notes?: string;
}

export interface LeaderOverviewMetrics {
  totalKrs: number;
  krsUpdatedOnTime: number;
  krsUpdatedLate: number;
  krsNoUpdate: number;
  krsAtRisk: number;
  krsStagnant: number; // Sem avanço 2+ semanas
  initiativesCritical: number;
  collaboratorsNeedingHelp: number;
}

export interface LeaderHighlight {
  id: string;
  type: 'stagnant' | 'blocked' | 'initiative_impact' | 'help_requested' | 'overdue';
  title: string;
  description: string;
  relatedKrId?: string;
  relatedInitiativeId?: string;
  relatedUserId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface LeaderPrepWizardState {
  metrics: LeaderOverviewMetrics | null;
  highlights: LeaderHighlight[];
  krActions: KrAction[];
  meetingNotes: string;
}

// ============================================================
// TEAM CHECKIN WIZARD
// ============================================================

export type TeamCheckinDecisionSourceStep = 'opening' | 'kr-review' | 'initiatives' | 'decisions' | 'panorama' | 'kpi-gate' | 'team-okrs-overview' | 'team-okrs-detail' | 'org-okrs' | 'closing';

// ============================================================
// MBR (MONTHLY BUSINESS REVIEW) WIZARD
// ============================================================

export type MbrStep = 'panorama' | 'kpi-gate' | 'team-okrs-overview' | 'team-okrs-detail' | 'org-okrs' | 'decisions' | 'closing';
export type MbrDecisionSourceStep = 'panorama' | 'kpi-gate' | 'team-okrs-overview' | 'team-okrs-detail' | 'org-okrs' | 'decisions' | 'closing';

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
  /** Escopo do KPI: org, area ou team */
  scope?: 'org' | 'area' | 'team';
  areaId?: string | null;
  areaName?: string | null;
  areaColor?: string | null;
  teamId?: string | null;
  teamName?: string | null;
}

/** OKR organizacional snapshot */
export interface MbrOrgOkrSnapshot {
  objectiveId: string;
  title: string;
  progress: number;
  status: string;
  trend: 'improving' | 'stable' | 'declining';
  remainsStrategicPriority: boolean;
}

/** Checklist de governança do MBR */
export interface MbrGovernanceChecklist {
  strategicFocusClear: boolean;
  nextStepsHaveOwners: boolean;
  nonPrioritiesClear: boolean;
  communicateInAllHands: boolean;
}

/** Feedback anônimo sobre melhoria do rito */
export interface RitualImprovementFeedback {
  id: string;
  text: string;
  status: 'pending' | 'implement' | 'evaluated' | 'discarded';
  createdAt: string;
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

/** Draft data completo do MBR */
export interface MbrDraftData {
  referenceMonth: string; // YYYY-MM
  kpiSnapshots: MbrKpiSnapshot[];
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  currentTeamIndex: number;
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  decisions: TeamCheckinDecision[];
  checklist: MbrGovernanceChecklist;
  ritualFeedback: RitualImprovementFeedback[];
  previousMbrPendingItems: TeamCheckinDecision[];
}

export interface TeamCheckinDecision {
  id: string;
  text: string;
  category: 'decision' | 'focus_adjustment' | 'next_step';
  sourceStep?: TeamCheckinDecisionSourceStep;
  owner?: {
    id: string;
    name: string;
  };
}

export interface TeamCheckinChecklist {
  knowWhatToFocus: boolean;
  knowWhatNotToDo: boolean;
  knowWhoIsResponsible: boolean;
}

export interface TeamCheckinWizardState {
  krsToReview: WizardKr[];
  decisions: TeamCheckinDecision[];
  checklist: TeamCheckinChecklist;
}

// ============================================================
// MANAGERS CHECKIN WIZARD
// ============================================================

export interface AreaOkrSummary {
  areaName: string;
  teamId: string;
  okrCount: number;
  avgProgress: number;
  trend: 'improving' | 'stable' | 'declining';
  atRiskCount: number;
}

export interface CrossDependency {
  id: string;
  description: string;
  fromTeam: { id: string; name: string };
  toTeam: { id: string; name: string };
  status: 'healthy' | 'at_risk' | 'blocked';
}

export interface ManagersWizardState {
  areaSummaries: AreaOkrSummary[];
  crossDependencies: CrossDependency[];
  adjustments: string[];
}

// ============================================================
// C-LEVEL CHECKIN WIZARD
// ============================================================

export interface CompanyOkrSummary {
  objectiveId: string;
  objectiveTitle: string;
  progress: number;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
  linkedAreaProgress: number;
}

export interface StrategicDirective {
  id: string;
  text: string;
  scope: 'company' | 'area' | 'specific_team';
  targetTeamId?: string;
}

export interface CLevelWizardState {
  companyOkrs: CompanyOkrSummary[];
  strategicDecisions: string[];
  directives: StrategicDirective[];
}

// ============================================================
// TEAM OKR CREATION WIZARD
// ============================================================

export type OkrKrType = 'foundational' | 'contribution' | 'enabler';
export type OkrDirection = 'up' | 'down' | 'maintain';
export type ResponsibilityModel = 'collaborative' | 'primary_led';
export type OwnerType = 'my_team' | 'other_team' | 'co_ownership';

export interface DraftTeamKr {
  id: string; // client-side temp id
  type: OkrKrType;
  title: string;
  baseline: number;
  noBaseline?: boolean;
  target: number;
  unit: string;
  direction: OkrDirection;
  owner_user_id: string | null;
  linked_org_kr_id: string | null;
}

/**
 * Draft KPI link for wizard pre-selection
 * Links will be created after KRs are saved
 */
export interface DraftKrMetricLink {
  /** Draft KR index this link belongs to */
  krIndex: number;
  /** KPI ID from kpi_metrics table */
  kpiId: string;
  /** KPI name for display */
  kpiName: string;
  /** Role: primary (progress) or guardrail (monitoring) */
  role: 'primary' | 'guardrail';
}

export interface DraftTeamDependency {
  krIndex: number;
  dependsOnTeamId?: string;
  dependsOnKrId?: string;
  description?: string;
  resolution?: 'adjust_target' | 'create_joint' | 'register_risk';
}

export interface DraftTeamInitiative {
  krIndex: number;
  name: string;
  owner_user_id: string | null;
  start_date?: string;
  expected_end_date?: string;
}

/**
 * Sharing configuration for Team OKRs
 * Captures whether an objective is shared across teams and the responsibility model
 */
export interface TeamOkrSharingConfig {
  /** Whether the objective is shared with other teams */
  isShared: boolean;
  /** Model of responsibility: collaborative (equal) or primary_led (one leads) */
  responsibilityModel: ResponsibilityModel;
  /** Type of ownership selected by user */
  ownerType: OwnerType;
  /** Team ID of the primary owner (can be different from creating team) */
  primaryTeamId: string;
  /** IDs of teams that contribute to this objective */
  contributingTeamIds: string[];
}

export interface TeamOkrCreationWizardState {
  // Step 1 - Context
  impactReflection: string;
  
  // Step 2 - Retrospective
  acknowledgedPastLearnings: boolean;
  
  // Step 3 - Objective
  objective: {
    title: string;
    description: string;
    org_objective_id: string | null;
    cycle_id: string | null;
  };
  
  // Step 4 - Sharing (NEW - Chapter 4.5)
  sharing: TeamOkrSharingConfig;
  
  // Step 5/6 - KRs
  krPlan: {
    foundational: number;
    contribution: number;
    enabler: number;
  };
  draftKrs: DraftTeamKr[];
  
  // Step 6.5 - KR Metrics (NEW)
  draftKrMetricLinks: DraftKrMetricLink[];
  
  // Step 7 - Dependencies
  dependencies: DraftTeamDependency[];
  
  // Step 8 - Initiatives
  initiatives: DraftTeamInitiative[];
  
  // Step 9 - Share
  generatedSummary: string | null;
  reflectionQuestions: string[];
}

// ============================================================
// WIZARD SESSION (PERSISTÊNCIA)
// ============================================================

export interface WizardSession {
  id: string;
  buId: string;
  cycleId: string | null;
  wizardType: WizardPersona;
  teamId: string | null;
  startedBy: string;
  startedAt: string;
  completedAt: string | null;
  decisions: TeamCheckinDecision[];
  actionItems: { task: string; ownerId: string }[];
  aiInsightsShown: VicInsight[];
}

// ============================================================
// VIC CONTEXT BUILDERS (para IA)
// ============================================================

export interface WizardVicContext extends VicContext {
  type: 'wizard-collaborator' | 'wizard-leader-prep' | 'wizard-team-checkin' | 'wizard-managers' | 'wizard-clevel' | 'wizard-team-okr-creation' | 'wizard-team-kr-creation' | 'wizard-mbr';
  wizardStep?: string;
  krContext?: {
    krId: string;
    krTitle: string;
    objectiveTitle: string;
    progress: number;
    status: string;
    daysSinceCheckin: number;
    linkedInitiativesCount: number;
  };
  teamContext?: {
    teamId: string;
    teamName: string;
    memberCount: number;
    krsTotal: number;
    krsAtRisk: number;
  };
}

// ============================================================
// ACTION CONTEXTS FOR VIC
// ============================================================

export const WIZARD_VIC_ACTION_CONTEXTS: Record<WizardPersona, VicActionContext> = {
  'collaborator': 'okr-check-alignment',
  'leader-prep': 'okr-review-quality',
  'team-checkin': 'okr-review-quality',
  'managers-checkin': 'okr-check-alignment',
  'clevel-checkin': 'okr-check-alignment',
  'team-okr-creation': 'okr-check-alignment',
  'team-kr-creation': 'okr-check-alignment',
  'mbr': 'okr-check-alignment',
};

// ============================================================
// WIZARD CONFIGS
// ============================================================

export const WIZARD_CONFIGS: Record<WizardPersona, WizardConfig> = {
  'collaborator': {
    persona: 'collaborator',
    title: 'Check-in Semanal',
    description: 'Reflexão individual + atualização consciente',
    steps: [
      { id: 'context', label: 'Contexto da Semana', shortLabel: 'Contexto' },
      { id: 'checkin', label: 'Atualização dos KRs', shortLabel: 'Check-in' },
      { id: 'kpis', label: 'Métricas e KPIs', shortLabel: 'KPIs', optional: true },
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'reflection', label: 'Reflexão Final', shortLabel: 'Reflexão' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis'],
  },
  'leader-prep': {
    persona: 'leader-prep',
    title: 'Preparação do Check-in',
    description: 'Prepare-se para conduzir um bom check-in com seu time',
    steps: [
      { id: 'overview', label: 'Visão Geral do Time', shortLabel: 'Visão' },
      { id: 'highlights', label: 'Destaques Automáticos', shortLabel: 'Destaques' },
      { id: 'preparation', label: 'Preparação da Pauta', shortLabel: 'Pauta' },
      { id: 'alignment', label: 'Alinhamento com Área', shortLabel: 'Alinhamento' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis', 'alinhamento-estrategico'],
  },
  'team-checkin': {
    persona: 'team-checkin',
    title: 'Check-in do Time',
    description: 'Alinhar, aprender e decidir junto com o time',
    steps: [
      { id: 'opening', label: 'Abertura', shortLabel: 'Abertura' },
      { id: 'kr-review', label: 'Revisão dos KRs', shortLabel: 'KRs' },
      { id: 'initiatives', label: 'Iniciativas Relevantes', shortLabel: 'Iniciativas' },
      { id: 'decisions', label: 'Decisões e Próximos Passos', shortLabel: 'Decisões' },
    ],
    aiAgents: ['coach-okrs', 'facilitador-decisoes'],
  },
  'managers-checkin': {
    persona: 'managers-checkin',
    title: 'Check-in de Gestores',
    description: 'Alinhamento entre áreas',
    steps: [
      { id: 'panorama', label: 'Panorama Geral', shortLabel: 'Panorama' },
      { id: 'cross-issues', label: 'Pontos de Atenção Cruzados', shortLabel: 'Atenção' },
      { id: 'adjustments', label: 'Ajustes de Foco', shortLabel: 'Ajustes' },
    ],
    aiAgents: ['alinhamento-estrategico'],
  },
  'clevel-checkin': {
    persona: 'clevel-checkin',
    title: 'Check-in Estratégico',
    description: 'Direção estratégica para a empresa',
    steps: [
      { id: 'company-okrs', label: 'Company OKRs', shortLabel: 'OKRs' },
      { id: 'insights', label: 'Leitura do Sistema', shortLabel: 'Insights' },
      { id: 'decisions', label: 'Decisões Estratégicas', shortLabel: 'Decisões' },
      { id: 'directives', label: 'Direcionamentos', shortLabel: 'Direcionamentos' },
    ],
    aiAgents: ['alinhamento-estrategico', 'analista-kpis'],
  },
  'team-okr-creation': {
    persona: 'team-okr-creation',
    title: 'Criação de OKRs do Time',
    description: 'Defina os objetivos e resultados-chave do seu time com alinhamento estratégico',
    steps: [
      { id: 'intro', label: 'Alinhamento Inicial', shortLabel: 'Intro' },
      { id: 'context', label: 'Contexto Organizacional', shortLabel: 'Contexto' },
      { id: 'retrospective', label: 'Aprendendo com o Passado', shortLabel: 'Retro' },
      { id: 'objective', label: 'Definindo o Objetivo', shortLabel: 'Objetivo' },
      { id: 'sharing', label: 'Responsabilidade', shortLabel: 'Times' },
      { id: 'kr-type', label: 'Escolhendo KRs', shortLabel: 'KRs' },
      { id: 'kr-detail', label: 'Detalhando KRs', shortLabel: 'Detalhe' },
      { id: 'dependencies', label: 'Dependências e Riscos', shortLabel: 'Deps', optional: true },
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'share', label: 'Compartilhar', shortLabel: 'Compartilhar' },
    ],
    aiAgents: ['cultura', 'coach-okrs', 'analista-kpis', 'alinhamento-estrategico', 'facilitador-decisoes', 'revisor-comunicacao'],
  },
  'team-kr-creation': {
    persona: 'team-kr-creation',
    title: 'Criação de Key Results',
    description: 'Defina como medir o sucesso do objetivo do time',
    steps: [
      { id: 'kr-context', label: 'Contexto', shortLabel: 'Contexto' },
      { id: 'kr-alignment', label: 'Alinhamento', shortLabel: 'Alinhamento' },
      { id: 'kr-type', label: 'Tipos de KR', shortLabel: 'Tipos' },
      { id: 'kr-detail', label: 'Detalhamento', shortLabel: 'KRs' },
      { id: 'kr-shared-check', label: 'Validação', shortLabel: 'Validação', optional: true },
      { id: 'kr-dependencies', label: 'Dependências', shortLabel: 'Deps', optional: true },
      { id: 'kr-initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'kr-review', label: 'Revisão', shortLabel: 'Revisar' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis', 'alinhamento-estrategico'],
  },
  'mbr': {
    persona: 'mbr',
    title: 'Monthly Business Review',
    description: 'Rito decisório mensal — saúde estratégica do negócio',
    steps: [
      { id: 'panorama', label: 'Panorama Executivo', shortLabel: 'Panorama' },
      { id: 'kpi-gate', label: 'KPI Gate Estratégico', shortLabel: 'KPI Gate' },
      { id: 'team-okrs-overview', label: 'OKRs dos Times', shortLabel: 'Times' },
      { id: 'team-okrs-detail', label: 'Análise por Time', shortLabel: 'Detalhe' },
      { id: 'org-okrs', label: 'OKRs Organizacionais', shortLabel: 'OKRs Org' },
      { id: 'decisions', label: 'Decisões Estratégicas', shortLabel: 'Decisões' },
      { id: 'closing', label: 'Encerramento', shortLabel: 'Encerrar' },
    ],
    aiAgents: ['analista-kpis', 'alinhamento-estrategico', 'facilitador-decisoes'],
  },
};
