/**
 * Wizard Types — Team OKR Creation (criação guiada de OKRs do time)
 *
 * Inclui também os tipos de Team KR Creation, dependências e iniciativas
 * em rascunho (compartilhados com QBR Pre via `proposedOkrs`).
 */

export type OkrKrType = 'foundational' | 'contribution' | 'enabler';
export type OkrDirection = 'up' | 'down' | 'maintain';
export type ResponsibilityModel = 'collaborative' | 'primary_led';
export type OwnerType = 'my_team' | 'other_team' | 'co_ownership';

export interface DraftTeamKr {
  /** client-side temp id */
  id: string;
  type: OkrKrType;
  title: string;
  baseline: number;
  noBaseline?: boolean;
  target: number;
  unit: string;
  direction: OkrDirection;
  owner_user_id: string | null;
  linked_org_kr_id: string | null;
}

/**
 * Draft KPI link for wizard pre-selection.
 * Links will be created after KRs are saved.
 */
export interface DraftKrMetricLink {
  /** Draft KR index this link belongs to */
  krIndex: number;
  /** KPI ID from kpi_metrics table */
  kpiId: string;
  /** KPI name for display */
  kpiName: string;
  /** Role: primary (progress) or guardrail (monitoring) */
  role: 'primary' | 'guardrail';
}

export interface DraftTeamDependency {
  krIndex: number;
  dependsOnTeamId?: string;
  dependsOnKrId?: string;
  description?: string;
  resolution?: 'adjust_target' | 'create_joint' | 'register_risk';
}

export interface DraftTeamInitiative {
  krIndex: number;
  name: string;
  owner_user_id: string | null;
  start_date?: string;
  expected_end_date?: string;
}

/**
 * Sharing configuration for Team OKRs.
 * Captures whether an objective is shared across teams and the responsibility model.
 */
export interface TeamOkrSharingConfig {
  /** Whether the objective is shared with other teams */
  isShared: boolean;
  /** Model of responsibility: collaborative (equal) or primary_led (one leads) */
  responsibilityModel: ResponsibilityModel;
  /** Type of ownership selected by user */
  ownerType: OwnerType;
  /** Team ID of the primary owner (can be different from creating team) */
  primaryTeamId: string;
  /** IDs of teams that contribute to this objective */
  contributingTeamIds: string[];
}

export interface TeamOkrCreationWizardState {
  // Step 1 - Context
  impactReflection: string;

  // Step 2 - Retrospective
  acknowledgedPastLearnings: boolean;

  // Step 3 - Objective
  objective: {
    title: string;
    description: string;
    org_objective_id: string | null;
    cycle_id: string | null;
  };

  // Step 4 - Sharing (Chapter 4.5)
  sharing: TeamOkrSharingConfig;

  // Step 5/6 - KRs
  krPlan: {
    foundational: number;
    contribution: number;
    enabler: number;
  };
  draftKrs: DraftTeamKr[];

  // Step 6.5 - KR Metrics
  draftKrMetricLinks: DraftKrMetricLink[];

  // Step 7 - Dependencies
  dependencies: DraftTeamDependency[];

  // Step 8 - Initiatives
  initiatives: DraftTeamInitiative[];

  // Step 9 - Share
  generatedSummary: string | null;
  reflectionQuestions: string[];
}
