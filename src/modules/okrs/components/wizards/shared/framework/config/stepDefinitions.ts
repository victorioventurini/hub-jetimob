/**
 * Step Definitions — SSOT estrutural por (persona × versão).
 *
 * Esta é a única fonte de verdade para "quais steps cada rito tem,
 * em que ordem, e com qual configuração". Containers de página
 * consomem `getStepDefinitions(persona, version)` para montar o wizard.
 *
 * REGRA DE OURO: nada de lógica condicional aqui. Apenas dados.
 * Lógica vive em `lib/completionEvaluator.ts` e `lib/visibilityEvaluator.ts`.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { StepDefinition, StepDefinitionMap } from '../types';

// ============================================================
// ONDA 1 — v2
// ============================================================

const collaboratorV2: StepDefinition[] = [
  { id: 'opening', component: 'BalanceStep', config: { period: 'weekly' } },
  { id: 'kpis', component: 'KpiGateStep', config: { requireResolution: false } },
  { id: 'krs', component: 'KrsStep', config: { mode: 'all', requireReview: false } },
  {
    id: 'projects-initiatives',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: true, scope: 'collaborator' },
  },
  {
    id: 'pending-decisions',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: false, groupInlineBySource: true },
  },
  {
    id: 'reflection',
    component: 'ReflectionStep',
    config: { questionSet: 'collaborator' },
  },
  {
    id: 'summary',
    component: 'SummaryAndSubmitStep',
    config: { requireConfirmDialog: true },
    suppressInlineDecisions: true,
  },
];

const leaderPrepV2: StepDefinition[] = [
  { id: 'balance', component: 'BalanceStep', config: { period: 'weekly' } },
  { id: 'kpis', component: 'KpiGateStep', config: { requireResolution: false } },
  { id: 'krs-attention', component: 'KrsStep', config: { mode: 'attention-only' } },
  {
    id: 'projects-initiatives',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: true, scope: 'team' },
  },
  {
    id: 'highlights-risks',
    component: 'HighlightsAndRisksStep',
    config: { variant: 'highlights-risks' },
  },
  {
    id: 'agenda',
    component: 'DecisionsStep',
    config: { includeCarryOver: false, includeCrossArea: false, groupInlineBySource: true },
  },
  {
    id: 'summary',
    component: 'SummaryAndSubmitStep',
    config: { requireConfirmDialog: true },
    suppressInlineDecisions: true,
  },
];

// ============================================================
// ONDA 2 — v3
// ============================================================

const teamCheckinV3: StepDefinition[] = [
  { id: 'opening', component: 'BalanceStep', config: { period: 'weekly' } },
  { id: 'kpi-gate', component: 'KpiGateStep', config: { requireResolution: true } },
  { id: 'krs-attention', component: 'KrsStep', config: { mode: 'attention-only', requireReview: true } },
  {
    id: 'projects-initiatives',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: true, scope: 'team' },
  },
  {
    id: 'highlights-risks',
    component: 'HighlightsAndRisksStep',
    config: { variant: 'highlights-risks' },
  },
  {
    id: 'decisions',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'closing',
    component: 'ClosingStep',
    config: { blocks: ['checklist', 'feedback', 'minutes'] },
    suppressInlineDecisions: true,
  },
];

const mbrPreV3: StepDefinition[] = [
  { id: 'balance', component: 'BalanceStep', config: { period: 'monthly' } },
  { id: 'kpis', component: 'KpiGateStep', config: { requireResolution: false } },
  { id: 'krs', component: 'KrsStep', config: { mode: 'all' } },
  {
    id: 'projects',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: false, scope: 'team' },
  },
  {
    id: 'highlights-risks',
    component: 'HighlightsAndRisksStep',
    config: { variant: 'highlights-risks' },
  },
  {
    id: 'next-steps',
    component: 'DecisionsStep',
    config: { includeCarryOver: false, includeCrossArea: false, groupInlineBySource: true },
  },
  {
    id: 'summary',
    component: 'SummaryAndSubmitStep',
    config: { requireConfirmDialog: true },
    suppressInlineDecisions: true,
  },
];

const qbrPreV3: StepDefinition[] = [
  { id: 'balance', component: 'BalanceStep', config: { period: 'cycle' } },
  { id: 'kpis-cycle', component: 'KpiGateStep', config: { requireResolution: false } },
  { id: 'krs-cycle', component: 'KrsStep', config: { mode: 'all' } },
  {
    id: 'projects-cycle',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: false, scope: 'team-cycle' },
  },
  {
    id: 'learnings-risks',
    component: 'HighlightsAndRisksStep',
    config: { variant: 'learnings-risks' },
  },
  // 'okr-proposal' permanece como step específico de QBR — não no framework
  // (mantido na implementação existente até a Onda 2 ser executada)
  {
    id: 'summary',
    component: 'SummaryAndSubmitStep',
    config: { requireConfirmDialog: true },
    suppressInlineDecisions: true,
  },
];

// ============================================================
// ONDA 3 — v4
// ============================================================

const mbrV4: StepDefinition[] = [
  { id: 'opening-executive', component: 'BalanceStep', config: { period: 'monthly' } },
  { id: 'kpi-gate', component: 'KpiGateStep', config: { requireResolution: true } },
  { id: 'teams-overview', component: 'KrsStep', config: { mode: 'teams-overview' } },
  { id: 'team-analysis', component: 'KrsStep', config: { mode: 'all', requireReview: true } },
  // 'org-okrs' e 'strategic-projects' são renderizados por componentes
  // específicos legados durante a Onda 3 (a serem migrados quando ativados)
  {
    id: 'strategic-projects',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: false, scope: 'cross-team', minTeamsForCrossTeam: 2 },
  },
  {
    id: 'decisions',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'closing',
    component: 'ClosingStep',
    config: { blocks: ['checklist', 'feedback', 'minutes', 'ceo-letter'] },
    suppressInlineDecisions: true,
  },
];

const qbrMeetingV4: StepDefinition[] = [
  { id: 'opening-executive', component: 'BalanceStep', config: { period: 'cycle' } },
  // 'okr-approval' permanece em componente específico (deliberação central)
  {
    id: 'decisions',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'closing',
    component: 'ClosingStep',
    config: { blocks: ['checklist', 'feedback', 'next-30-days'] },
    suppressInlineDecisions: true,
  },
];

const qbrPostV4: StepDefinition[] = [
  // 'okr-promotion' permanece em componente específico
  {
    id: 'decisions-adjustments',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'commitments-followup',
    component: 'DecisionsStep',
    config: { includeCarryOver: false, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'closing',
    component: 'ClosingStep',
    config: { blocks: ['minutes', 'ceo-letter'] },
    suppressInlineDecisions: true,
  },
];

// ============================================================
// MAPA SSOT
// ============================================================

export const STEP_DEFINITIONS: StepDefinitionMap = {
  'collaborator': { v2: collaboratorV2 },
  'leader-prep': { v2: leaderPrepV2 },
  'team-checkin': { v3: teamCheckinV3 },
  'mbr-pre': { v3: mbrPreV3 },
  'qbr-pre': { v3: qbrPreV3 },
  'mbr': { v4: mbrV4 },
  'qbr-meeting': { v4: qbrMeetingV4 },
  'qbr-post': { v4: qbrPostV4 },
};

/**
 * Retorna a lista ordenada de steps para um (persona × versão).
 * Devolve `undefined` se a versão não estiver definida — caller decide se
 * usa renderer legado ou erro.
 */
export function getStepDefinitions(
  persona: WizardPersona,
  version: StructureVersion,
): StepDefinition[] | undefined {
  return STEP_DEFINITIONS[persona]?.[version];
}
