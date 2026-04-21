/**
 * Wizards Framework — Barrel Export
 *
 * Framework genérico e agnóstico de `WizardPersona` para a padronização
 * estrutural dos ritos (TCR — Onda 1+).
 *
 * REGRA DE OURO:
 * - Componentes em `components/` NÃO podem ler `wizardType` para
 *   alterar comportamento. Toda variação vive em `config/`.
 * - SSOT de labels: `@/modules/okrs/constants/ritualLabels` (RITUAL_STEP_LABELS).
 * - SSOT estrutural: `config/stepDefinitions.ts`.
 * - SSOT de versões: `config/structureVersions.ts`.
 *
 * Decisão inline ubíqua: todos os steps ativos renderizam
 * `InlineDecisionInput` via `_InlineDecisionsSlot`. Steps de consolidação
 * final (`SummaryAndSubmitStep`, `ClosingStep`) são exceção documentada.
 */

// Components
export { BalanceStep } from './components/BalanceStep';
export type { BalanceStepProps } from './components/BalanceStep';

export { KpiGateStep } from './components/KpiGateStep';
export type { KpiGateStepProps } from './components/KpiGateStep';

export { KrsStep } from './components/KrsStep';
export type { KrsStepProps } from './components/KrsStep';

export { ProjectsAndInitiativesStep } from './components/ProjectsAndInitiativesStep';
export type { ProjectsAndInitiativesStepProps } from './components/ProjectsAndInitiativesStep';

export { HighlightsAndRisksStep } from './components/HighlightsAndRisksStep';
export type { HighlightsAndRisksStepProps } from './components/HighlightsAndRisksStep';

export { LeaderInsightsStep } from './components/LeaderInsightsStep';
export type { LeaderInsightsStepProps } from './components/LeaderInsightsStep';

export { DecisionsStep } from './components/DecisionsStep';
export type { DecisionsStepProps } from './components/DecisionsStep';

export { ClosingStep } from './components/ClosingStep';
export type { ClosingStepProps, ClosingStepData } from './components/ClosingStep';

export { SummaryAndSubmitStep } from './components/SummaryAndSubmitStep';
export type { SummaryAndSubmitStepProps } from './components/SummaryAndSubmitStep';

export { ReflectionStep } from './components/ReflectionStep';
export type { ReflectionStepProps, ReflectionStepData } from './components/ReflectionStep';

export { InlineDecisionsSlot } from './components/_InlineDecisionsSlot';
export type { InlineDecisionsSlotProps } from './components/_InlineDecisionsSlot';

// Config
export { STEP_DEFINITIONS, getStepDefinitions } from './config/stepDefinitions';
export {
  STRUCTURE_VERSION_BY_WIZARD_TYPE,
  getCurrentStructureVersion,
} from './config/structureVersions';
export { COMPLETION_RULES, getCompletionRules } from './config/stepCompletionRules';
export { VISIBILITY_RULES, getVisibilityRule } from './config/stepVisibilityRules';
export {
  groupDecisionsBySourceStep,
} from './config/stepContentAdapters';
export type {
  BalanceContent,
  KpiGateItem,
  KrsItem,
  ProjectItem,
  InitiativeItem,
  HighlightItem,
  LeaderInsightItem,
  LeaderInsightsData,
  DecisionsBySourceStep,
} from './config/stepContentAdapters';

// Hooks
export { useDecisionsAggregator } from './hooks/useDecisionsAggregator';
export type { UseDecisionsAggregatorReturn } from './hooks/useDecisionsAggregator';

// Lib (evaluators puros)
export { evaluateRule } from './lib/completionEvaluator';
export type { EvaluatorContext, EvaluationResult } from './lib/completionEvaluator';
export { isVisible } from './lib/visibilityEvaluator';
export type { VisibilityContext } from './lib/visibilityEvaluator';

// Types
export type {
  FrameworkComponentId,
  FrameworkStepConfig,
  StepDefinition,
  StepDefinitionMap,
  RitualCompletionRules,
  StepCompletionRule,
  CompletionRuleId,
  VisibilityRuleId,
  SectionVisibility,
  FrameworkStepProps,
  BalanceStepConfig,
  KpiGateStepConfig,
  KrsStepConfig,
  ProjectsAndInitiativesStepConfig,
  HighlightsAndRisksStepConfig,
  LeaderInsightsStepConfig,
  DecisionsStepConfig,
  ClosingStepConfig,
  SummaryAndSubmitStepConfig,
  ReflectionStepConfig,
} from './types';
