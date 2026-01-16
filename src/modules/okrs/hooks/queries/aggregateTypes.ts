/**
 * OKR Aggregate Query Types
 * 
 * Shared types for aggregate OKR queries.
 */

import type { OkrRagStatus, OkrDirection, OkrKrType } from '../../types';

export interface TeamKrLinked {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  team_objective_id: string | null;
  team_objective_title: string | null;
  type: OkrKrType;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  last_checkin_at: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  progress: number;
}

export interface OrgKrWithTeamKrs {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  progress: number;
  trend: 'up' | 'stable' | 'down';
  linkedTeamKrs: TeamKrLinked[];
}

export interface LinkedTeamObjective {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  krs: TeamKrLinked[];
}

export interface OrgObjectiveWithKrs {
  id: string;
  title: string;
  description: string | null;
  year: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'discarded';
  aggregatedStatus: 'on_track' | 'at_risk' | 'off_track';
  aggregatedProgress: number;
  orgKrs: OrgKrWithTeamKrs[];
  linkedTeamObjectives: LinkedTeamObjective[];
}

export interface OkrContributor {
  id: string;
  objective_id: string;
  team_id: string;
  created_at: string;
  team?: {
    id: string;
    name: string;
  };
}
