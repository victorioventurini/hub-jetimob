/**
 * Mapa: WizardPersona → versão estrutural ATUAL (gravada em novas sessões).
 *
 * Sessões antigas mantêm a versão registrada em
 * `okr_wizard_sessions.structure_version`. Este mapa controla apenas qual
 * versão é gravada em sessões NOVAS (ondas de entrega do framework).
 *
 * - v1 = pré-padronização (estrutura legada)
 * - v2 = Onda 1 (Check-in Individual, Pré-Check-in do Time)
 * - v3 = Onda 2 (Check-in do Time, Pré-MBR, Pré-QBR)
 * - v4 = Onda 3 (MBR, QBR, Pós-QBR)
 *
 * Cada rito mantém seu próprio contador — ex: MBR vai de v1 direto para v4
 * porque não foi alterado em ondas intermediárias.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';

export const STRUCTURE_VERSION_BY_WIZARD_TYPE: Record<WizardPersona, StructureVersion> = {
  // Onda 1
  'collaborator': 'v1', // será promovido para v2 ao ativar a Onda 1
  'leader-prep': 'v1',  // será promovido para v2 ao ativar a Onda 1

  // Onda 2
  'team-checkin': 'v1', // → v3
  'mbr-pre': 'v1',      // → v3
  'qbr-pre': 'v1',      // → v3

  // Onda 3
  'mbr': 'v1',          // → v4
  'qbr-meeting': 'v1',  // → v4
  'qbr-post': 'v1',     // → v4

  // Não impactados pela padronização (mantêm v1)
  'clevel-checkin': 'v1',
  'team-okr-creation': 'v1',
  'team-kr-creation': 'v1',
  'qbr-pre-clevel': 'v1',

  // Históricos / descontinuados (preservam v1)
  'managers-checkin': 'v1',
  'mbr-first': 'v1',
  'mbr-pre-first': 'v1',
};

/**
 * Versão a ser gravada em uma nova sessão deste tipo de rito.
 * Use sempre que iniciar/persistir uma sessão para alimentar a coluna
 * `okr_wizard_sessions.structure_version`.
 */
export function getCurrentStructureVersion(persona: WizardPersona): StructureVersion {
  return STRUCTURE_VERSION_BY_WIZARD_TYPE[persona] ?? 'v1';
}
