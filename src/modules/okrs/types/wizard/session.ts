/**
 * Wizard Types — Session
 *
 * Tipo da sessão persistida em `okr_wizard_sessions`. Mantido isolado
 * porque é referenciado por hooks transversais (`useGenericWizardDraft`,
 * `useWizardSession`).
 */

import type { WizardPersona, VicInsight } from './core';
import type { TeamCheckinDecision } from './shared';

export interface WizardSession {
  id: string;
  buId: string;
  cycleId: string | null;
  wizardType: WizardPersona;
  teamId: string | null;
  startedBy: string;
  startedAt: string;
  completedAt: string | null;
  decisions: TeamCheckinDecision[];
  actionItems: { task: string; ownerId: string }[];
  aiInsightsShown: VicInsight[];
}
