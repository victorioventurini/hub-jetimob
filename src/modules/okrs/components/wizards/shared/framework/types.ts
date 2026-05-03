/**
 * Framework Types — Padronização Estrutural dos Ritos
 *
 * Tipos compartilhados pela camada de configuração e pelos componentes
 * genéricos do framework. Mantém componentes 100% agnósticos de
 * `WizardPersona` — toda variação vive em `config`.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';

// ============================================================
// COMPONENTE → CONFIG TIPADO
// ============================================================

/**
 * Identificadores canônicos dos componentes genéricos do framework.
 * Cada um corresponde a um arquivo em `framework/components/`.
 */
export type FrameworkComponentId =
  | 'BalanceStep'
  | 'KpiGateStep'
  | 'KrsStep'
  | 'ProjectsAndInitiativesStep'
  | 'HighlightsAndRisksStep'
  | 'LeaderInsightsStep'
  | 'DecisionsStep'
  | 'ClosingStep'
  | 'SummaryAndSubmitStep'
  | 'ReflectionStep';

// ----- Configs por componente -----

export interface BalanceStepConfig {
  /** Período de referência exibido no copy */
  period: 'weekly' | 'monthly' | 'cycle';
}

export interface KpiGateStepConfig {
  /** Se obrigatório, bloqueia avanço até resolver KPIs em alerta */
  requireResolution?: boolean;
  /**
   * Variante visual do card de KPI:
   * - `compact` (default): card minimalista (lista de buckets) — usado por
   *   personas sem necessidade de plano detalhado por KPI.
   * - `rich`: card completo com sparkline canônica + bloco de "Ação do líder"
   *   por bucket (justify / explain-no-data / opcional / read-only).
   */
  cardVariant?: 'compact' | 'rich';
}

export interface KrsStepConfig {
  /**
   * all = todos; attention-only = apenas em atenção; teams-overview = visão por time (MBR);
   * leader-actions = pauta do líder (botões discuss_group/followup_1on1 + notas de reunião)
   */
  mode: 'all' | 'attention-only' | 'teams-overview' | 'leader-actions';
  /** Quando true, exige revisão explícita dos KRs marcados antes de avançar */
  requireReview?: boolean;
  /**
   * Quando true (apenas em mode='leader-actions'), exige ao menos uma ação
   * marcada (discuss_group ou followup_1on1) antes de avançar.
   */
  requireLeaderAction?: boolean;
}

export interface ProjectsAndInitiativesStepConfig {
  showProjects: boolean;
  showInitiatives: boolean;
  /** Escopo dos projetos exibidos */
  scope: 'collaborator' | 'team' | 'team-cycle' | 'cross-team';
  /** Quando true, mostra apenas projetos com ≥ N times participantes (MBR) */
  minTeamsForCrossTeam?: number;
}

export interface HighlightsAndRisksStepConfig {
  /** Variação narrativa: highlights+risks (default) vs learnings+risks (Pré-QBR) */
  variant: 'highlights-risks' | 'learnings-risks';
}

/**
 * LeaderInsightsStep — read-only para destaques gerados pelo sistema/IA
 * (estagnados, bloqueados, alto-impacto, pediu ajuda, atrasados).
 * Diferente do `HighlightsAndRisksStep` (CRUD livre).
 */
export interface LeaderInsightsStepConfig {
  /** Quando true, exibe seção de Insights da IA (Vic) acima dos system highlights */
  showAiInsights?: boolean;
  /** Permite descartar insights individualmente (apenas IA) */
  dismissable?: boolean;
}

export interface DecisionsStepConfig {
  includeCarryOver?: boolean;
  includeCrossArea?: boolean;
  /** Se true, agrupa decisões inline pelo `sourceStep` no painel de consolidação */
  groupInlineBySource?: boolean;
}

export interface ClosingStepConfig {
  blocks: Array<'checklist' | 'feedback' | 'minutes' | 'ceo-letter' | 'next-30-days'>;
}

export interface SummaryAndSubmitStepConfig {
  /** Confirmação final antes do submit */
  requireConfirmDialog?: boolean;
}

export interface ReflectionStepConfig {
  /** Conjunto de perguntas exibido (chave de ReflectionQuestions) */
  questionSet: 'collaborator' | 'collaborator-final' | 'leader' | 'initiative' | 'strategic';
}

export type FrameworkStepConfig =
  | BalanceStepConfig
  | KpiGateStepConfig
  | KrsStepConfig
  | ProjectsAndInitiativesStepConfig
  | HighlightsAndRisksStepConfig
  | LeaderInsightsStepConfig
  | DecisionsStepConfig
  | ClosingStepConfig
  | SummaryAndSubmitStepConfig
  | ReflectionStepConfig
  | Record<string, never>;

// ============================================================
// STEP DEFINITION (SSOT estrutural)
// ============================================================

export interface StepDefinition {
  /** Identificador estável do step (não pode mudar entre versões — é a chave de label e regras) */
  id: string;
  /** Componente genérico responsável pela renderização */
  component: FrameworkComponentId;
  /** Configuração específica do componente para este rito/versão */
  config?: FrameworkStepConfig;
  /** Quando true, o framework não renderiza `InlineDecisionInput` neste step */
  suppressInlineDecisions?: boolean;
}

export interface StepDefinitionMap {
  /** persona → versão → ordered list de steps */
  [persona: string]: Partial<Record<StructureVersion, StepDefinition[]>>;
}

// ============================================================
// COMPLETION & VISIBILITY RULES
// ============================================================

/**
 * Regras de gate são identificadas por slug declarativo. A implementação
 * vive em `lib/completionEvaluator.ts`. Componentes não conhecem as regras —
 * apenas reportam dados ao evaluator.
 */
export type CompletionRuleId =
  | 'always'
  | 'allMarkedKrsReviewed'
  | 'allActiveTeamsAnalyzed'
  | 'allAtRiskKpisAddressed'
  | 'allMandatoryKpisAddressed'
  | 'carryOverHandledIfPresent'
  | 'atLeastOneLeaderAction'
  | 'hasAnyDecisionOrSkip';

export interface StepCompletionRule {
  /** Condição para considerar o step concluído / pronto para avanço */
  required?: CompletionRuleId;
  /** Mensagem exibida quando a condição não é satisfeita */
  errorMessage?: string;
}

export interface RitualCompletionRules {
  steps: Record<string, StepCompletionRule>;
  submission: {
    requiredSteps: string[];
    optionalSteps?: string[];
  };
}

export type VisibilityRuleId =
  | 'always'
  | 'hasCarryOver'
  | 'hasCrossArea'
  | 'projectsModuleEnabled'
  | 'qbrCompletedInLastQuarter';

export interface SectionVisibility {
  rule: VisibilityRuleId;
}

// ============================================================
// CONTEXT EXPOSTO AO COMPONENTE
// ============================================================

/**
 * Contrato mínimo que cada componente do framework recebe.
 * `data` e `onChange` são tipados pelo componente individualmente.
 */
export interface FrameworkStepProps<TData = unknown, TConfig = FrameworkStepConfig> {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: TConfig;
  data: TData;
  onDataChange: (next: TData) => void;
  /** Decisões consolidadas do rito inteiro (todos os sourceSteps) */
  decisions: import('@/modules/okrs/types/wizard').TeamCheckinDecision[];
  onDecisionsChange: (
    next: import('@/modules/okrs/types/wizard').TeamCheckinDecision[],
  ) => void;
}
