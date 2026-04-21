/**
 * Leader Prep Wizard Components - Barrel Export
 *
 * v2.83.0: Added LeaderKpiAlertStep for indicator attention section
 * v3.0.0:  Migração full para framework genérico v2 — `LeaderHighlightsStep`
 *          e `LeaderPrepStep` foram substituídos por
 *          `LeaderInsightsStep` e `KrsStep` (mode='leader-actions') em
 *          `shared/framework`. Os componentes proprietários foram removidos.
 */

export { LeaderOverviewStep } from './LeaderOverviewStep';
export type { LeaderOverviewStepProps } from './LeaderOverviewStep';

export { LeaderKpiAlertStep } from './LeaderKpiAlertStep';
export type { LeaderKpiAlertStepProps } from './LeaderKpiAlertStep';

export { LeaderAlignmentStep, type ParentObjective } from './LeaderAlignmentStep';
export type { LeaderAlignmentStepProps } from './LeaderAlignmentStep';

export { LeaderProjectsStep } from './LeaderProjectsStep';
export type { LeaderProjectsStepProps } from './LeaderProjectsStep';

export { LeaderPrepWizardCard } from './LeaderPrepWizardCard';
export type { LeaderPrepWizardCardProps } from './LeaderPrepWizardCard';
