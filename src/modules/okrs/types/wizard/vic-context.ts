/**
 * Wizard Types — Vic Context
 *
 * Estende `VicContext` com campos típicos de wizards (KR/team).
 * Mantém também o mapa de `WIZARD_VIC_ACTION_CONTEXTS` consumido pelo
 * roteamento de agentes.
 */

import type { VicActionContext, VicContext } from '@/modules/vic/types';
import type { WizardPersona } from './core';

export interface WizardVicContext extends VicContext {
  type:
    | 'wizard-collaborator'
    | 'wizard-leader-prep'
    | 'wizard-team-checkin'
    | 'wizard-managers'
    | 'wizard-clevel'
    | 'wizard-team-okr-creation'
    | 'wizard-team-kr-creation'
    | 'wizard-mbr-pre'
    | 'wizard-mbr'
    | 'wizard-qbr-pre'
    | 'wizard-qbr-pre-clevel'
    | 'wizard-qbr-meeting'
    | 'wizard-qbr-post';
  wizardStep?: string;
  krContext?: {
    krId: string;
    krTitle: string;
    objectiveTitle: string;
    progress: number;
    status: string;
    daysSinceCheckin: number;
    linkedInitiativesCount: number;
  };
  teamContext?: {
    teamId: string;
    teamName: string;
    memberCount: number;
    krsTotal: number;
    krsAtRisk: number;
  };
}

// ============================================================
// ACTION CONTEXTS FOR VIC
// ============================================================

export const WIZARD_VIC_ACTION_CONTEXTS: Partial<
  Record<WizardPersona, VicActionContext>
> = {
  collaborator: 'okr-check-alignment',
  'leader-prep': 'okr-review-quality',
  'team-checkin': 'okr-review-quality',
  'managers-checkin': 'okr-check-alignment',
  'clevel-checkin': 'okr-check-alignment',
  'team-okr-creation': 'okr-check-alignment',
  'team-kr-creation': 'okr-check-alignment',
  'mbr-pre': 'okr-check-alignment',
  mbr: 'okr-check-alignment',
  'qbr-pre': 'okr-check-alignment',
  'qbr-pre-clevel': 'okr-check-alignment',
  'qbr-meeting': 'okr-check-alignment',
  'qbr-post': 'okr-check-alignment',
};
