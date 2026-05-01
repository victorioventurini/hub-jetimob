/**
 * SSOT da sequência de steps do Check-in Individual (Collaborator).
 *
 * Importado por:
 * - `CollaboratorCheckinPage` (navegação, filtragem dinâmica)
 * - `CollaboratorContextStep` (Step 1 — snapshot e trilha derivam ordem daqui)
 *
 * Regra: a ordem do snapshot e da trilha do Step 1 DEVE espelhar `STEP_ORDER`.
 * Reordenar entradas aqui propaga automaticamente para o Step 1.
 */

export type WizardStep =
  | 'context'
  | 'kpis'
  | 'projects'
  | 'initiatives'
  | 'checkin'
  | 'decisions'
  | 'reflection'
  | 'summary';

export interface WizardStepDefinition {
  id: WizardStep;
  label: string;
  description: string;
}

export const WIZARD_STEPS: readonly WizardStepDefinition[] = [
  { id: 'context', label: 'Visão geral', description: 'Contexto dos KRs e KPIs' },
  { id: 'kpis', label: 'Indicadores operacionais', description: 'Atualização de métricas e KPIs (1 por sub-passo)' },
  { id: 'projects', label: 'Projetos', description: 'Atualização de marcos' },
  { id: 'initiatives', label: 'Iniciativas', description: 'Iniciativas vinculadas aos KRs' },
  { id: 'checkin', label: 'KRs', description: 'Atualização das KRs' },
  { id: 'decisions', label: 'Pendências', description: 'Decisões e registros pendentes' },
  { id: 'reflection', label: 'Reflexão final', description: 'O que mais impactou seus resultados' },
  { id: 'summary', label: 'Resumo', description: 'Visão consolidada' },
] as const;

export const STEP_ORDER: readonly WizardStep[] = WIZARD_STEPS.map((s) => s.id);
