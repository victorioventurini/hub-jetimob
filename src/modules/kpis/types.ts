// ============================================================
// KPI Module Types - Hub da Jet
// v2.1: Lifecycle, Confidence, Period, RAG
// v2.82.0: Category deprecated, governance evolution
// ============================================================

// === Core Types ===

/**
 * @deprecated v2.82.0 - Use area_id for organizational ownership instead.
 * Categoria funcional foi substituída por Área estratégica para evitar duplicidade conceitual.
 * Mantido para compatibilidade e rollback.
 */
export type KpiCategory = 'financeiro' | 'growth' | 'cs' | 'produto' | 'operacoes' | 'pessoas';

export type KpiDirection = 'up' | 'down';
export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'manual';
export type KpiStatus = 'active' | 'inactive';
export type KpiValueSource = 'manual' | 'api' | 'webhook' | 'spreadsheet' | 'database' | 'integration' | 'calculation';
export type KpiVisibility = 'restricted' | 'team' | 'bu';
export type KpiRagStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';
export type KpiComparisonRule = 'higher_is_better' | 'lower_is_better' | 'equal_to_target';

// === v2.1 New Types ===
export type KpiIndicatorType = 'kpi' | 'metric';
export type KpiLifecycleStatus = 'proposed' | 'active' | 'observing' | 'deprecated';
export type KpiConfidenceLevel = 'high' | 'medium' | 'low';

// === v2.2 Governance Types ===
export type KpiScope = 'team' | 'area' | 'org';

export interface KpiMetric {
  id: string;
  name: string;
  description: string | null;
  /** @deprecated v2.82.0 - Use area_id for organizational ownership */
  category?: KpiCategory;
  bu_id: string;
  owner_user_id: string | null;
  team_id: string | null;
  unit: string;
  direction: KpiDirection;
  frequency: KpiFrequency;
  target_value: number | null;
  status: KpiStatus;
  source_type: KpiValueSource;
  source_config: Record<string, unknown> | null;
  visibility: KpiVisibility;
  comparison_rule: KpiComparisonRule;
  linked_okrs: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // v2.1 new fields
  indicator_type: KpiIndicatorType;
  lifecycle_status: KpiLifecycleStatus;
  target_source: string | null;
  recovery_protocol: string | null;
  // v2.2 governance fields
  area_id: string | null;
  scope: KpiScope;
  // Relations
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
  area?: {
    id: string;
    name: string;
    color: string | null;
  };
}

export interface KpiValue {
  id: string;
  kpi_id: string;
  value: number;
  reference_date: string;
  source: KpiValueSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // v2.1 new fields
  period_start: string | null;
  period_end: string | null;
  period_label: string | null;
  confidence: KpiConfidenceLevel;
  rag_status: KpiRagStatus | null;
  // Relations
  created_by_user?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
}

export interface KpiWithValues extends KpiMetric {
  values: KpiValue[];
  current_value: number | null;
  previous_value: number | null;
  variation: number | null;
  trend: 'up' | 'down' | 'stable';
  rag_status: KpiRagStatus;
  // Campos de auditoria
  last_updated_at: string | null;
  last_update_source: KpiValueSource | null;
  last_updated_by: string | null;
  last_updated_by_user?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  last_update_failed?: boolean;
}

export const CATEGORY_LABELS: Record<KpiCategory, string> = {
  financeiro: 'Financeiro',
  growth: 'Growth',
  cs: 'Customer Success',
  produto: 'Produto',
  operacoes: 'Operações',
  pessoas: 'Pessoas',
};

export const CATEGORY_COLORS: Record<KpiCategory, string> = {
  financeiro: 'bg-status-green',
  growth: 'bg-info',
  cs: 'bg-surface-administer',
  produto: 'bg-status-yellow',
  operacoes: 'bg-status-red',
  pessoas: 'bg-info',
};

export const CATEGORY_ICONS: Record<KpiCategory, string> = {
  financeiro: 'DollarSign',
  growth: 'TrendingUp',
  cs: 'Heart',
  produto: 'Package',
  operacoes: 'Settings',
  pessoas: 'Users',
};

export const FREQUENCY_LABELS: Record<KpiFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  manual: 'Manual',
};

export const DIRECTION_LABELS: Record<KpiDirection, string> = {
  up: 'Maior é melhor',
  down: 'Menor é melhor',
};

// === v2.1 New Labels ===
export const INDICATOR_TYPE_LABELS: Record<KpiIndicatorType, string> = {
  kpi: 'KPI',
  metric: 'Métrica',
};

export const LIFECYCLE_STATUS_LABELS: Record<KpiLifecycleStatus, string> = {
  proposed: 'Proposto',
  active: 'Ativo',
  observing: 'Em Observação',
  deprecated: 'Depreciado',
};

// === v2.2 Governance Labels ===
/** @deprecated Use getScopeLabels(buName) for dynamic BU name */
export const SCOPE_LABELS: Record<KpiScope, string> = {
  team: 'Time',
  area: 'Área',
  org: 'Organização (Global)',
};

/**
 * Returns dynamic scope labels with BU name instead of "Organização"
 * @param buName - Name of the current Business Unit
 */
export function getScopeLabels(buName?: string): Record<KpiScope, string> {
  const orgLabel = buName ? `${buName} (Global)` : 'Organização (Global)';
  return {
    team: 'Time',
    area: 'Área',
    org: orgLabel,
  };
}

export const CONFIDENCE_LABELS: Record<KpiConfidenceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const SOURCE_TYPE_LABELS: Record<KpiValueSource, string> = {
  manual: 'Manual',
  api: 'API',
  webhook: 'Webhook',
  spreadsheet: 'Planilha',
  database: 'Banco de Dados',
  integration: 'Integração',
  calculation: 'Cálculo',
};

export const SOURCE_TYPE_ICONS: Record<KpiValueSource, string> = {
  manual: 'Edit',
  api: 'Plug',
  webhook: 'Webhook',
  spreadsheet: 'Sheet',
  database: 'Database',
  integration: 'Link',
  calculation: 'Calculator',
};

export const VISIBILITY_LABELS: Record<KpiVisibility, string> = {
  restricted: 'Restrita',
  team: 'Time',
  bu: 'Unidade de Negócio',
};

export const COMPARISON_RULE_LABELS: Record<KpiComparisonRule, string> = {
  higher_is_better: 'Maior é melhor',
  lower_is_better: 'Menor é melhor',
  equal_to_target: 'Igual ao alvo',
};

import { KPI_RAG_STATUS_STYLES } from '@/lib/colors';

export const RAG_STATUS_CONFIG: Record<KpiRagStatus, { label: string; color: string; bgColor: string }> = {
  on_track: { label: KPI_RAG_STATUS_STYLES.on_track.label, color: KPI_RAG_STATUS_STYLES.on_track.text, bgColor: KPI_RAG_STATUS_STYLES.on_track.bg },
  at_risk: { label: KPI_RAG_STATUS_STYLES.at_risk.label, color: KPI_RAG_STATUS_STYLES.at_risk.text, bgColor: KPI_RAG_STATUS_STYLES.at_risk.bg },
  off_track: { label: KPI_RAG_STATUS_STYLES.off_track.label, color: KPI_RAG_STATUS_STYLES.off_track.text, bgColor: KPI_RAG_STATUS_STYLES.off_track.bg },
  no_data: { label: KPI_RAG_STATUS_STYLES.no_data.label, color: KPI_RAG_STATUS_STYLES.no_data.text, bgColor: KPI_RAG_STATUS_STYLES.no_data.bg },
};

// Calculate RAG status based on current value, target, and direction
export function calculateRagStatus(
  currentValue: number | null,
  targetValue: number | null,
  direction: KpiDirection
): KpiRagStatus {
  if (currentValue === null || targetValue === null) {
    return 'no_data';
  }

  const percentage = direction === 'up' 
    ? (currentValue / targetValue) * 100
    : (targetValue / currentValue) * 100;

  if (percentage >= 90) return 'on_track';
  if (percentage >= 70) return 'at_risk';
  return 'off_track';
}

// ============================================================
// v2.83.0: Contributor & Wizard V2 Types
// ============================================================

/**
 * Role types for KPI data contributors
 */
export type KpiContributorRole = 'data_entry' | 'reviewer';

/**
 * A user who contributes data to a KPI (separate from owner accountability)
 */
export interface KpiContributor {
  id: string;
  kpi_id: string;
  contributor_user_id: string;
  role: KpiContributorRole;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  bu_id: string;
  deleted_at: string | null;
  // Relations
  contributor?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
}

/**
 * User's role in relation to a KPI
 */
export type KpiUserRole = 'owner' | 'contributor' | 'viewer';

/**
 * Display mode for KPI in wizard context
 */
export type KpiDisplayMode = 'editable' | 'readonly' | 'alert';

/**
 * Reason why a KPI is in alert state
 */
export type KpiAlertReason = 'off_track' | 'at_risk' | 'outdated' | 'guardrail_violated';

/**
 * Scope for wizard KPI fetching
 */
export type KpiWizardScope = 'collaborator' | 'leader' | 'manager' | 'clevel';

/**
 * Extended KPI type for wizard V2 with role-based classification
 */
export interface KpiForWizardV2 {
  id: string;
  name: string;
  unit: string;
  target_value: number | null;
  direction: KpiDirection;
  frequency: KpiFrequency;
  lifecycle_status: KpiLifecycleStatus;
  recovery_protocol: string | null;
  team_id: string | null;
  area_id: string | null;
  owner_user_id: string | null;
  scope: KpiScope;
  // Latest value data
  latest_value: number | null;
  latest_reference_date: string | null;
  latest_rag_status: KpiRagStatus;
  latest_confidence: KpiConfidenceLevel | null;
  latest_period_label: string | null;
  needs_update: boolean;
  // v2.83.0: Role-based classification
  userRole: KpiUserRole;
  isStrategic: boolean;
  isGuardrailAtRisk: boolean;
  linkedKrIds: string[];
  displayMode: KpiDisplayMode;
  alertReason: KpiAlertReason | null;
  // Relations
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
  area?: {
    id: string;
    name: string;
    color: string | null;
  };
}

/**
 * Options for useKpisForWizardV2 hook
 */
export interface UseKpisForWizardV2Options {
  userId: string;
  teamId?: string;
  areaId?: string;
  scope?: KpiWizardScope;
  includeGuardrailsAtRisk?: boolean;
}

/**
 * Result from useKpisForWizardV2 hook with role-based KPI classification
 */
export interface UseKpisForWizardV2Result {
  // Separated by role
  kpisToUpdate: KpiForWizardV2[];      // Contributor needs to update
  kpisTeamContext: KpiForWizardV2[];   // Team context (read-only)
  kpisStrategic: KpiForWizardV2[];     // Strategic globals (read-only)
  kpisInAlert: KpiForWizardV2[];       // In alert (yellow/red)
  guardrailsViolated: KpiForWizardV2[]; // Guardrails linked to KRs
  
  // Summary flags
  hasUpdatesNeeded: boolean;
  hasAlertsToShow: boolean;
  hasGuardrailsViolated: boolean;
  isLoading: boolean;
  hasError: boolean;
}

export const CONTRIBUTOR_ROLE_LABELS: Record<KpiContributorRole, string> = {
  data_entry: 'Entrada de Dados',
  reviewer: 'Revisor',
};

export const USER_ROLE_LABELS: Record<KpiUserRole, string> = {
  owner: 'Responsável',
  contributor: 'Contribuidor',
  viewer: 'Visualizador',
};

export const ALERT_REASON_LABELS: Record<KpiAlertReason, string> = {
  off_track: 'Fora da meta',
  at_risk: 'Em risco',
  outdated: 'Desatualizado',
  guardrail_violated: 'Guardrail violado',
};
