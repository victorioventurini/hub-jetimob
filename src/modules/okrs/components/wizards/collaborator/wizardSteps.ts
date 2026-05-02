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
  { id: 'context', label: 'Abertura', description: 'Sua semana até aqui' },
  { id: 'kpis', label: 'Indicadores', description: 'Atualize seus KPIs e métricas' },
  { id: 'projects', label: 'Projetos', description: 'Revise marcos e prazos' },
  { id: 'initiatives', label: 'Iniciativas', description: 'Atualize ações dos seus KRs' },
  { id: 'checkin', label: 'KRs', description: 'Registre progresso e confiança' },
  { id: 'decisions', label: 'Pendências', description: 'Resolva ou encaminhe itens abertos' },
  { id: 'reflection', label: 'Reflexão', description: 'Bloqueios e pedidos de ajuda' },
  { id: 'summary', label: 'Resumo e envio', description: 'Revise e envie seu check-in' },
] as const;

export const STEP_ORDER: readonly WizardStep[] = WIZARD_STEPS.map((s) => s.id);
