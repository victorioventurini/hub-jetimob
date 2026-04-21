import type { WizardPersona } from '../types/wizard';

/**
 * Catálogo canônico de wizard types que devem existir no calendário de ritos.
 */
export const ALL_RITUAL_WIZARD_TYPES: WizardPersona[] = [
  'collaborator',
  'leader-prep',
  'team-checkin',
  // 'managers-checkin' removido — rito descontinuado, substituído pelo MBR.
  'clevel-checkin',
  'team-okr-creation',
  'team-kr-creation',
  'mbr',
  'mbr-pre',
  'mbr-first',
  'mbr-pre-first',
  'qbr-pre',
  'qbr-pre-clevel',
  'qbr-meeting',
  'qbr-post',
];
