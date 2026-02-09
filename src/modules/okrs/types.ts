// OKR Module Types

export type OkrStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'discarded';
export type OkrRagStatus = 'green' | 'yellow' | 'red' | 'not_started';
export type OkrKrType = 'contribution' | 'enabler' | 'foundational';
export type OkrDirection = 'up' | 'down' | 'maintain';
export type OkrConfidence = 'high' | 'medium' | 'low';
export type OkrDependencyStatus = 'ok' | 'blocked' | 'at_risk';
export type OkrReportFrequency = 'weekly' | 'monthly' | 'quarterly' | 'event';
export type OkrChannel = 'email' | 'slack' | 'both';
export type OkrContributionEntityType = 'objective' | 'kr';
export type OkrMetricRole = 'primary' | 'guardrail';

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
  year?: number | null;
  bu_id?: string | null;
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

// Contributions (informational relationships)
export interface OkrContribution {
  id: string;
  from_type: OkrContributionEntityType;
  from_id: string;
  to_type: OkrContributionEntityType;
  to_id: string;
  bu_id?: string | null;
  description?: string | null;
  created_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
}

// KR Metrics (KPI linkage)
export interface OkrKrMetric {
  id: string;
  kr_id: string;
  kr_type: 'org' | 'team';
  kpi_id: string;
  role: OkrMetricRole;
  created_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
  // Joined data
  kpi?: {
    id: string;
    name: string;
    unit: string;
    target_value?: number | null;
    direction: string;
  };
}

// Re-export calculateProgress from utils for backwards compatibility
// FONTE DE VERDADE: src/modules/okrs/utils/progressCalculation.ts
export { calculateProgress } from './utils/progressCalculation';

export function getRagStatusColor(status: OkrRagStatus): string {
  switch (status) {
    case 'green':
      return 'bg-status-green';
    case 'yellow':
      return 'bg-status-yellow';
    case 'red':
      return 'bg-status-red';
    case 'not_started':
    default:
      return 'bg-status-gray';
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
    case 'discarded':
      return 'Descartado';
  }
}

// ============================================================
// v3.4.2: KR Effective Target Helper
// ============================================================

/**
 * Interface para dados da KPI primária aninhados na KR
 */
export interface KrPrimaryKpiData {
  id: string;
  role: string;
  kpi_id: string;
  kpi?: {
    id: string;
    name: string;
    target_value: number | null;
  } | null;
}

/**
 * Extrai o target efetivo de uma KR.
 * Se há KPI primária vinculada, usa target_value da KPI.
 * Caso contrário, usa o target original da KR.
 * 
 * @param krTarget - Target original da KR
 * @param primaryKpiLinks - Array de links KPI-KR (vem do JOIN na query)
 */
export function getKrEffectiveTarget(
  krTarget: number,
  primaryKpiLinks?: KrPrimaryKpiData[] | null
): number {
  if (!primaryKpiLinks || primaryKpiLinks.length === 0) {
    return krTarget;
  }
  
  // Encontrar o link primário
  const primaryLink = primaryKpiLinks.find(link => link.role === 'primary');
  if (!primaryLink?.kpi?.target_value) {
    return krTarget;
  }
  
  return primaryLink.kpi.target_value;
}

/**
 * Verifica se a KR tem uma KPI primária vinculada
 */
export function hasKrPrimaryKpi(primaryKpiLinks?: KrPrimaryKpiData[] | null): boolean {
  if (!primaryKpiLinks || primaryKpiLinks.length === 0) {
    return false;
  }
  return primaryKpiLinks.some(link => link.role === 'primary');
}
