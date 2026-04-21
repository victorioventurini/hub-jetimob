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
  {
    id: 'leader-insights',
    component: 'LeaderInsightsStep',
    config: { showAiInsights: true, dismissable: true },
  },
  {
    id: 'projects-initiatives',
    component: 'ProjectsAndInitiativesStep',
    config: { showProjects: true, showInitiatives: true, scope: 'team' },
  },
  {
    id: 'prep',
    component: 'KrsStep',
    config: { mode: 'leader-actions', requireLeaderAction: false },
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
// ONDA 3 — v4 (PRÉ-ATIVAÇÃO — aguardando Q-end)
// ============================================================
//
// Estado: definições prontas, mas o mapeamento ativo em
// `STRUCTURE_VERSION_BY_WIZARD_TYPE` permanece em 'v1' por governança
// do TCR (não trocar estrutura no meio do trimestre vigente).
//
// Steps marcados como `// LEGADO:` permanecem em componentes específicos
// durante a Onda 3 — o framework atua como SSOT estrutural enquanto a UI
// rica é mantida. Ver memórias canônicas:
//   - mem://features/rituals/mbr-ritual-alignment-standard
//   - mem://features/rituals/qbr-meeting-ritual-standard-v2-0-0
//   - mem://features/rituals/qbr-post-ritual-standard-v2-0-0
// ------------------------------------------------------------

/**
 * MBR v4 (Reunião Mensal de Negócio) — 8 etapas canônicas.
 * Steps `org-okrs` e `qbr-followup` são LEGADO (componentes específicos
 * com lógica de cobertura cross-team / urgência de prazo).
 */
const mbrV4: StepDefinition[] = [
  { id: 'opening-executive', component: 'BalanceStep', config: { period: 'monthly' } },
  { id: 'kpi-gate', component: 'KpiGateStep', config: { requireResolution: true } },
  { id: 'teams-overview', component: 'KrsStep', config: { mode: 'teams-overview' } },
  {
    id: 'team-analysis',
    component: 'KrsStep',
    config: { mode: 'all', requireReview: true },
  },
  // LEGADO: 'org-okrs' (cobertura cross-team com badge "Sem cobertura")
  // LEGADO: 'qbr-followup' (decisões com bordas de urgência)
  {
    id: 'strategic-projects',
    component: 'ProjectsAndInitiativesStep',
    config: {
      showProjects: true,
      showInitiatives: false,
      scope: 'cross-team',
      minTeamsForCrossTeam: 2,
    },
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

/**
 * QBR Meeting v4 — 5 etapas canônicas.
 * Step 'review' é LEGADO (Review Timer 9min, badge OKR compartilhado,
 * formulário "Ajustes Estruturados", TeamDeliveryScorecard por card).
 * Step 'org-okrs' é LEGADO (deliberação sobre OKRs organizacionais).
 * Step 1 NÃO exibe scorecard do quarter (canônico).
 */
const qbrMeetingV4: StepDefinition[] = [
  { id: 'opening-executive', component: 'BalanceStep', config: { period: 'cycle' } },
  // LEGADO: 'review' (KRs com Review Timer + ajustes estruturados)
  // LEGADO: 'org-okrs' (deliberação organizacional)
  {
    id: 'decisions',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  {
    id: 'closing',
    component: 'ClosingStep',
    // Sem 'next-30-days' aqui — esta seção foi movida para QBR Post.
    config: { blocks: ['checklist', 'feedback'] },
    suppressInlineDecisions: true,
  },
];

/**
 * QBR Post v4 — 5 etapas canônicas.
 * Steps `promotion`, `commitments` e `cadence` são LEGADO (UIs ricas:
 * scorecard histórico + seletor de ciclo destino, atribuição nominal,
 * datas MBR/check-ins read-only).
 */
const qbrPostV4: StepDefinition[] = [
  // LEGADO: 'promotion' (scorecard histórico + seletor de ciclo destino + ajustes finos KR)
  {
    id: 'decisions-adjustments',
    component: 'DecisionsStep',
    config: { includeCarryOver: true, includeCrossArea: true, groupInlineBySource: true },
  },
  // LEGADO: 'commitments' (atribuição nominal + vínculo OKR promovido)
  // LEGADO: 'cadence' (datas MBR/check-ins read-only)
  {
    id: 'closing',
    component: 'ClosingStep',
    // 'minutes' = ata + carta de contexto do CEO + checklist dinâmico
    config: { blocks: ['minutes', 'ceo-letter'] },
    suppressInlineDecisions: true,
  },
];

// ============================================================
// ONDA 4 — v2 (Ritos semanais — Pré-Weekly e Weekly)
// ============================================================
//
// Pré-Weekly: rito de DESTILAÇÃO (não coleta) — 4 steps, 5 min de duração-alvo.
// Weekly: rito executivo da BU consumindo curadoria do agente
// `curador-orquestrador` na Abertura Executiva.
//
// Steps marcados como `// LEGADO:` serão implementados em containers específicos
// (UI rica + adapters de DB + integração com agente). Esta definição registra
// a estrutura canônica no SSOT antes da implementação dos containers.
// ------------------------------------------------------------

/**
 * Pré-Weekly v2 — 4 etapas canônicas (destilação executiva do líder).
 *
 * - Step 1 (sources): PreparationStatusCard em modo 'antessala' mostrando
 *   as 3 fontes do próprio líder (Check-in Individual, Pré-Check-in do Time,
 *   Check-in do Time). Gate flexível — permite prosseguir com gaps.
 * - Step 2 (pauta): seleção e classificação estruturada de até 3 itens
 *   das fontes; máximo 1 manual; contexto obrigatório quando urgência=alta.
 * - Step 3 (pessoas): 4 campos curtos (risco/movimentação/reconhecimento/sobrecarga)
 *   que alimentam o PeopleStep da Weekly INDEPENDENTEMENTE do Step 2.
 * - Step 4 (summary): SummaryAndSubmitStep canônico.
 */
const preWeeklyV2: StepDefinition[] = [
  // LEGADO: 'sources' (PreparationStatusCard mode='antessala' + gate flexível)
  // LEGADO: 'pauta' (seleção+classificação de até 3 itens com adapter consolidador)
  // LEGADO: 'pessoas' (4 campos curtos com canal independente para Weekly)
  {
    id: 'summary',
    component: 'SummaryAndSubmitStep',
    config: { requireConfirmDialog: true },
    suppressInlineDecisions: true,
  },
];

/**
 * Weekly v2 — 4 etapas canônicas (rito executivo da BU).
 *
 * - Step 1 (executive-opening): PreparationStatusCard mode='list' (cobertura
 *   dos Pré-Weekly da BU) + Abertura Executiva curada por `curador-orquestrador`
 *   com fallback manual quando bu_ia_config.ia_enabled=false.
 * - Step 2 (priorities): pauta consolidada cross-times (Performance/Projetos).
 * - Step 3 (people): canal duplo — temas priorizados (bloco='Pessoas') +
 *   sinais estruturais do Step 3 dos Pré-Weekly.
 * - Step 4 (closing): ClosingStep canônico (checklist + ata).
 */
const weeklyV2: StepDefinition[] = [
  // LEGADO: 'executive-opening' (PreparationStatusCard list + AberturaExecutivaStep curada)
  // LEGADO: 'priorities' (pauta cross-times consolidada)
  // LEGADO: 'people' (PeopleStep dual-channel)
  {
    id: 'closing',
    component: 'ClosingStep',
    config: { blocks: ['checklist', 'minutes'] },
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
  'pre-weekly': { v2: preWeeklyV2 },
  'weekly': { v2: weeklyV2 },
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
