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
  // Onda 1 — ATIVA
  // Estratégia híbrida: páginas mantêm seus step components ricos
  // (CollaboratorCheckinStep, CollaboratorKpiStep, etc.) e o framework
  // atua como SSOT estrutural + versionamento. Novas sessões gravam v2;
  // sessões antigas (v1) renderizam via SnapshotReportView (snapshot imutável).
  'collaborator': 'v2',
  'leader-prep': 'v2',

  // Onda 2 — ATIVA
  // Estratégia híbrida: páginas mantêm step components ricos atuais;
  // framework atua como SSOT estrutural + versionamento.
  'team-checkin': 'v3',
  'mbr-pre': 'v3',
  'qbr-pre': 'v3',

  // Onda 3 — ATIVA (Q-end flip)
  // Estrutura v4 ativada. Novas sessões usam framework genérico
  // (stepDefinitions v4 + completion/visibility rules v4);
  // sessões antigas (structure_version='v1') renderizam via SnapshotReportView.
  'mbr': 'v4',
  'mbr-v2': 'v4',
  'qbr-meeting': 'v4',
  'qbr-post': 'v4',

  // Onda 4 — ATIVA (semanais)
  // Pré-Weekly nasce como rito enxuto de DESTILAÇÃO executiva (4 steps, 5 min).
  // Weekly consome a curadoria do agente `curador-orquestrador` na Abertura Executiva.
  // Ambos estreiam em v2 (sem v1 legado, pois são ritos novos).
  'pre-weekly': 'v2',
  'weekly': 'v2',

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
