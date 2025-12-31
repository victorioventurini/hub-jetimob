// OKR Module Types

export type OkrStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type OkrRagStatus = 'green' | 'yellow' | 'red' | 'not_started';
export type OkrKrType = 'contribution' | 'enabler' | 'foundational';
export type OkrDirection = 'up' | 'down';
export type OkrConfidence = 'high' | 'medium' | 'low';
export type OkrDependencyStatus = 'ok' | 'blocked' | 'at_risk';
export type OkrReportFrequency = 'weekly' | 'monthly' | 'quarterly' | 'event';
export type OkrChannel = 'email' | 'slack' | 'both';

// Org Objectives
export interface OkrOrgObjective {
  id: string;
  title: string;
  description?: string | null;
  year: number;
  owner_user_id?: string | null;
  status: OkrStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined data
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
  key_results?: OkrOrgKeyResult[];
}

// Org Key Results
export interface OkrOrgKeyResult {
  id: string;
  org_objective_id: string;
  title: string;
  metric_id?: string | null;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  owner_user_id?: string | null;
  status: OkrRagStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined data
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
}

// Team Objectives
export interface OkrTeamObjective {
  id: string;
  team_id: string;
  org_objective_id: string;
  cycle_id?: string | null;
  title: string;
  description?: string | null;
  owner_user_id?: string | null;
  status: OkrStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined data
  team?: {
    id: string;
    name: string;
  };
  org_objective?: OkrOrgObjective;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
  key_results?: OkrTeamKeyResult[];
}

// Team Key Results
export interface OkrTeamKeyResult {
  id: string;
  team_objective_id?: string | null;
  parent_kr_id?: string | null;
  team_id: string;
  title: string;
  type: OkrKrType;
  metric_id?: string | null;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  owner_user_id?: string | null;
  co_responsibles: string[];
  linked_org_kr_id?: string | null;
  status: OkrRagStatus;
  evidence_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined data
  team?: {
    id: string;
    name: string;
  };
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
  team_objective?: OkrTeamObjective;
  checkins?: OkrCheckin[];
  dependencies?: OkrDependency[];
}

// Dependencies
export interface OkrDependency {
  id: string;
  kr_id: string;
  depends_on_team_id?: string | null;
  depends_on_kr_id?: string | null;
  description?: string | null;
  status: OkrDependencyStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  depends_on_team?: {
    id: string;
    name: string;
  };
  depends_on_kr?: OkrTeamKeyResult;
}

// Check-ins
export interface OkrCheckin {
  id: string;
  kr_id: string;
  date: string;
  previous_value?: number | null;
  current_value: number;
  confidence: OkrConfidence;
  blockers?: string | null;
  comments?: string | null;
  user_id: string;
  created_at: string;
  // Joined data
  user?: {
    display_name: string;
    photo_url?: string | null;
  };
}

// Reports Config
export interface OkrReportsConfig {
  id: string;
  name: string;
  frequency: OkrReportFrequency;
  audience: string[];
  content_blocks: unknown[];
  channels: OkrChannel;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Notifications Log
export interface OkrNotificationLog {
  id: string;
  type: string;
  channel: OkrChannel;
  target: string;
  payload?: unknown;
  sent_at: string;
  status: string;
  error_message?: string | null;
}

// Audit Log
export interface OkrAuditLog {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  old_value?: unknown;
  new_value?: unknown;
  user_id?: string | null;
  created_at: string;
}

// Utility functions
export function calculateProgress(
  baseline: number,
  current: number,
  target: number,
  direction: OkrDirection
): number {
  if (direction === 'up') {
    if (target === baseline) {
      return current >= target ? 100 : 0;
    }
    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, progress));
  } else {
    if (baseline === target) {
      return current <= target ? 100 : 0;
    }
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, Math.min(100, progress));
  }
}

export function getRagStatusColor(status: OkrRagStatus): string {
  switch (status) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    case 'not_started':
    default:
      return 'bg-gray-400';
  }
}

export function getConfidenceLabel(confidence: OkrConfidence): string {
  switch (confidence) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Média';
    case 'low':
      return 'Baixa';
  }
}

export function getKrTypeLabel(type: OkrKrType): string {
  switch (type) {
    case 'contribution':
      return 'Contribuição';
    case 'enabler':
      return 'Habilitador';
    case 'foundational':
      return 'Fundacional';
  }
}

export function getStatusLabel(status: OkrStatus): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'active':
      return 'Ativo';
    case 'completed':
      return 'Concluído';
    case 'cancelled':
      return 'Cancelado';
  }
}
