/**
 * Evaluation Config — SSOT declarativa por persona
 *
 * Define, para cada `WizardPersona`, se o rito tem coleta de avaliação
 * anônima (QR + página pública sem login) e como ela se comporta.
 *
 * Componentes NÃO leem `wizardType` — apenas consomem essa configuração.
 *
 * Permission keys:
 *  - `okrs.evaluation.open:as_conductor`  → abrir coleta
 *  - `okrs.evaluation.close:as_conductor` → encerrar coleta
 *  - `okrs.evaluation.view:as_conductor`  → ver respostas abertas pós-fechamento
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface EvaluationConfig {
  /** Quando false, o rito NÃO exibe o step de avaliação anônima */
  enabled: boolean;
  /** Mostra a 2ª pergunta opcional "o que funcionou e merece repetir?" */
  showWhatWorked?: boolean;
  /** Recomenda encerrar a coleta antes de avançar para o encerramento do rito */
  closeRequiredBeforeComplete?: boolean;
}

/**
 * Configuração canônica por persona.
 * Adicionar novo rito coletivo = adicionar entrada `enabled: true` aqui
 * (sem mexer em componente).
 *
 * **Escopo aprovado (briefing externo + decisão do usuário 2026-05-04):**
 * apenas ritos coletivos entre lideranças com cadência mensal ou superior.
 * Weekly e QBR-Pre-CLevel ficaram FORA — feedback inline anterior será
 * removido.
 */
export const EVALUATION_CONFIG: Record<WizardPersona, EvaluationConfig> = {
  // ── Coletivos com avaliação ──
  mbr:           { enabled: true, showWhatWorked: true, closeRequiredBeforeComplete: true },
  'mbr-first':   { enabled: true, showWhatWorked: true, closeRequiredBeforeComplete: true },
  'qbr-meeting': { enabled: true, showWhatWorked: true, closeRequiredBeforeComplete: true },
  'qbr-post':    { enabled: true, showWhatWorked: true, closeRequiredBeforeComplete: true },

  // ── Coletivos SEM avaliação (decisão explícita) ──
  weekly:           { enabled: false },
  'qbr-pre-clevel': { enabled: false },
  'team-checkin':   { enabled: false },
  'managers-checkin': { enabled: false },

  // ── Individuais (sem avaliação) ──
  collaborator:        { enabled: false },
  'leader-prep':       { enabled: false },
  'clevel-checkin':    { enabled: false },
  'pre-weekly':        { enabled: false },
  'mbr-pre':           { enabled: false },
  'mbr-pre-first':     { enabled: false },
  'qbr-pre':           { enabled: false },
  'team-okr-creation': { enabled: false },
  'team-kr-creation':  { enabled: false },
};

export function getEvaluationConfig(persona: WizardPersona): EvaluationConfig {
  return EVALUATION_CONFIG[persona] ?? { enabled: false };
}

export function isEvaluationEnabled(persona: WizardPersona): boolean {
  return getEvaluationConfig(persona).enabled;
}

/** Permission keys (mesmo padrão de attendance) */
export const EVALUATION_PERMISSIONS = {
  open:  'okrs.evaluation.open:as_conductor',
  close: 'okrs.evaluation.close:as_conductor',
  view:  'okrs.evaluation.view:as_conductor',
} as const;
