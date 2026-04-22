/**
 * Wizard Types — Leader Prep (Pré Check-in do Time, segunda-feira)
 */

export type KrActionType =
  | 'discuss_group'
  | 'followup_1on1'
  | 'at_risk'
  | 'needs_attention';

export interface KrAction {
  krId: string;
  actionType: KrActionType;
  notes?: string;
}

export interface LeaderOverviewMetrics {
  totalKrs: number;
  krsUpdatedOnTime: number;
  krsUpdatedLate: number;
  krsNoUpdate: number;
  krsAtRisk: number;
  /** Sem avanço 2+ semanas */
  krsStagnant: number;
  initiativesCritical: number;
  collaboratorsNeedingHelp: number;
}

export interface LeaderHighlight {
  id: string;
  type:
    | 'stagnant'
    | 'blocked'
    | 'initiative_impact'
    | 'help_requested'
    | 'overdue';
  title: string;
  description: string;
  relatedKrId?: string;
  relatedInitiativeId?: string;
  relatedUserId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface LeaderPrepWizardState {
  metrics: LeaderOverviewMetrics | null;
  highlights: LeaderHighlight[];
  krActions: KrAction[];
  meetingNotes: string;
}
