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
export { InlineCollapsibleEntryInput } from './InlineCollapsibleEntryInput';
export type {
  CategoryConfig,
  InlineCollapsibleEntryInputProps,
} from './InlineCollapsibleEntryInput';
export { InlineAgendaSuggestionInput, AGENDA_CATEGORY_CONFIG } from './InlineAgendaSuggestionInput';
export type { InlineAgendaSuggestionInputProps } from './InlineAgendaSuggestionInput';
export { AgendaSuggestionsPrioritizer } from './AgendaSuggestionsPrioritizer';
export type { AgendaSuggestionsPrioritizerProps } from './AgendaSuggestionsPrioritizer';

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

export { CarryOverDecisionsSection } from './CarryOverDecisionsSection';
export type { CarryOverDecisionsSectionProps } from './CarryOverDecisionsSection';

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

export { InlineStringListEditor } from './InlineStringListEditor';
export type { InlineStringListEditorProps } from './InlineStringListEditor';

export { SummaryKrBalance } from './SummaryKrBalance';
export type { SummaryKrBalanceProps, SummaryKrBalanceItem } from './SummaryKrBalance';

export { SummaryKpiList } from './SummaryKpiList';
export type { SummaryKpiListProps } from './SummaryKpiList';

export { JustificationField } from './JustificationField';
export type { JustificationFieldProps } from './JustificationField';

// =========================
// RITUAL GREETING (Step 1 — saudação contextual)
// =========================
export { RitualGreeting } from './RitualGreeting';
export type { RitualGreetingProps } from './RitualGreeting';
export { RitualGreetingForStep } from './RitualGreetingForStep';
export type { RitualGreetingForStepProps } from './RitualGreetingForStep';

export { ReferenceMonthPicker } from './ReferenceMonthPicker';
export type { ReferenceMonthPickerProps } from './ReferenceMonthPicker';
