/**
 * Ritual Labels — Single Source of Truth (SSOT)
 *
 * Mapa canônico de labels exibidos ao usuário para cada `WizardPersona`.
 * Todos os hooks, componentes, cards, headers e filtros DEVEM importar
 * `RITUAL_LABELS` ou `getRitualLabel()` deste módulo. Nunca duplicar.
 *
 * IMPORTANTE:
 * - Slugs técnicos (`WizardPersona`) permanecem inalterados.
 * - Labels de personas históricas/descontinuadas mantêm sufixo
 *   identificador para preservar legibilidade do histórico.
 */

import type { WizardPersona } from '../types/wizard';

export const RITUAL_LABELS: Record<WizardPersona, string> = {
  // Ativos
  'collaborator': 'Check-in Individual',
  'leader-prep': 'Pré-Check-in do Time',
  'team-checkin': 'Check-in do Time',
  'clevel-checkin': 'Check-in Executivo',
  'team-okr-creation': 'Criação de OKRs do Time',
  'team-kr-creation': 'Criação de KRs do Time',
  'mbr-pre': 'Pré-MBR',
  'mbr': 'MBR',
  'qbr-pre': 'Pré-QBR',
  'qbr-pre-clevel': 'Pré-QBR Executivo',
  'qbr-meeting': 'QBR',
  'qbr-post': 'Pós-QBR',

  // Históricos / descontinuados (back-compat de registros antigos)
  'managers-checkin': 'Check-in de Gestores (descontinuado)',
  'mbr-first': 'MBR (histórico)',
  'mbr-pre-first': 'Pré-MBR (histórico)',
};

/**
 * Retorna o label canônico do rito ou o slug, caso a persona seja desconhecida.
 */
export function getRitualLabel(persona: WizardPersona | string): string {
  return (RITUAL_LABELS as Record<string, string>)[persona] ?? String(persona);
}
