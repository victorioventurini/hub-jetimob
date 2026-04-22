/**
 * Shared Wizard Components - Barrel Export
 * WizardShell e WizardContextSelector removidos (Wave 6 - migração para fullpage)
 */

export { VicInsightCard, VicInsightsList } from './VicInsightCard';
export type { VicInsightCardProps, VicInsightsListProps } from './VicInsightCard';

export { 
  AlertBanner, 
  OverdueAlert, 
  NoUpdateAlert, 
  StagnantAlert 
} from './AlertBanner';
export type { AlertBannerProps, AlertBannerType } from './AlertBanner';

export { 
  ReflectionQuestions, 
  MicrocopyQuestion,
  COLLABORATOR_QUESTIONS,
  COLLABORATOR_FINAL_QUESTIONS,
  LEADER_DISCUSSION_QUESTIONS,
  INITIATIVE_QUESTIONS,
  STRATEGIC_QUESTIONS,
} from './ReflectionQuestions';
export type { ReflectionQuestion, ReflectionQuestionsProps } from './ReflectionQuestions';

export { KrContextCard } from './KrContextCard';
export type { KrContextCardProps } from './KrContextCard';

export { InitiativesSummary } from './InitiativesSummary';
export type { InitiativesSummaryProps } from './InitiativesSummary';

export { 
  WizardStepFooter, 
  WizardFirstStepFooter, 
  WizardLastStepFooter, 
  WizardOptionalStepFooter 
} from './WizardStepFooter';
export type { WizardStepFooterProps } from './WizardStepFooter';

export { WizardStepHeader } from './WizardStepHeader';
export type { WizardStepHeaderProps, WizardHeaderVariant } from './WizardStepHeader';

export { LastCheckinBadge } from './LastCheckinBadge';

export { LatestCheckinSummary } from './LatestCheckinSummary';
export type { LatestCheckinSummaryProps } from './LatestCheckinSummary';

export { FullPageWizardShell } from './FullPageWizardShell';
export type { FullPageWizardShellProps } from './FullPageWizardShell';

export { WizardStepper, WizardStepperCompact } from './WizardStepper';
export type { WizardStepDefinition } from './WizardStepper';

export { AdminContextSwitcher } from './AdminContextSwitcher';
export type { AdminContextSwitcherProps } from './AdminContextSwitcher';

export { InlineDecisionInput } from './InlineDecisionInput';
export type { InlineDecisionInputProps } from './InlineDecisionInput';

export { DecisionCard } from './DecisionCard';
export type { DecisionCardProps } from './DecisionCard';

export { WizardStepScaffold } from './WizardStepScaffold';
export type { WizardStepScaffoldProps } from './WizardStepScaffold';

export { KrLinkedDetails } from './KrLinkedDetails';
export type { KrLinkedDetailsProps } from './KrLinkedDetails';

export { TeamKrsToggle } from './TeamKrsToggle';
export type { TeamKrsToggleProps } from './TeamKrsToggle';

export { KpiStatusBlocks, OutdatedKpisBlock, PendingKpisBlock, useKpiStatusClassification } from './KpiStatusBlocks';
export type { KpiStatusBlocksProps } from './KpiStatusBlocks';

export { TeamDeliveryScorecard, buildTeamScorecardFromOrgObjectives, computeTeamHealth } from './TeamDeliveryScorecard';
export type { TeamDeliveryScorecardData, TeamDeliveryScorecardProps } from './TeamDeliveryScorecard';

export { DecisionFollowUpRow } from './DecisionFollowUpRow';
export type { DecisionFollowUpRowProps } from './DecisionFollowUpRow';

export {
  PreparationStatusCard,
  PREPARATION_PARTICIPANT_STATES,
} from './PreparationStatusCard';
export type {
  PreparationStatusCardProps,
  PreparationStatusMode,
  PreparationStatus,
  PreparationParticipant,
  PreparationSection,
  SourceRitualSummary,
} from './PreparationStatusCard';

export { RitualPreparationStatus } from './RitualPreparationStatus';
export type { RitualPreparationStatusProps } from './RitualPreparationStatus';

export { RitualAttendance } from './RitualAttendance';
export type { RitualAttendanceProps } from './RitualAttendance';
