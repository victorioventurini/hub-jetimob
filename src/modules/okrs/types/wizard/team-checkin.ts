/**
 * Wizard Types — Team Checkin (Check-in coletivo durante a reunião)
 */

import type { WizardKr } from '../../hooks/useTeamPendingKrs';
import type { TeamCheckinDecision } from './shared';

export interface TeamCheckinChecklist {
  knowWhatToFocus: boolean;
  knowWhatNotToDo: boolean;
  knowWhoIsResponsible: boolean;
}

export interface TeamCheckinWizardState {
  krsToReview: WizardKr[];
  decisions: TeamCheckinDecision[];
  checklist: TeamCheckinChecklist;
}
