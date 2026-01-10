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
  | 'team-okr-creation';

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

export interface CollaboratorWizardState {
  krs: WizardKr[];
  results: CollaboratorCheckinResult[];
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

export interface TeamCheckinDecision {
  id: string;
  text: string;
  category: 'decision' | 'focus_adjustment' | 'next_step';
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
export type OkrDirection = 'up' | 'down';

export interface DraftTeamKr {
  id: string; // client-side temp id
  type: OkrKrType;
  title: string;
  baseline: number;
  target: number;
  unit: string;
  direction: OkrDirection;
  owner_user_id: string | null;
  linked_org_kr_id: string | null;
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
  
  // Step 4/5 - KRs
  krPlan: {
    foundational: number;
    contribution: number;
    enabler: number;
  };
  draftKrs: DraftTeamKr[];
  
  // Step 6 - Dependencies
  dependencies: DraftTeamDependency[];
  
  // Step 7 - Initiatives
  initiatives: DraftTeamInitiative[];
  
  // Step 8 - Share
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
  type: 'wizard-collaborator' | 'wizard-leader-prep' | 'wizard-team-checkin' | 'wizard-managers' | 'wizard-clevel' | 'wizard-team-okr-creation';
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
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'reflection', label: 'Reflexão Final', shortLabel: 'Reflexão' },
    ],
    aiAgents: ['coach-okrs'],
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
      { id: 'kr-type', label: 'Escolhendo KRs', shortLabel: 'KRs' },
      { id: 'kr-detail', label: 'Detalhando KRs', shortLabel: 'Detalhe' },
      { id: 'dependencies', label: 'Dependências e Riscos', shortLabel: 'Deps', optional: true },
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'share', label: 'Compartilhar', shortLabel: 'Compartilhar' },
    ],
    aiAgents: ['cultura', 'coach-okrs', 'analista-kpis', 'alinhamento-estrategico', 'facilitador-decisoes', 'revisor-comunicacao'],
  },
};
