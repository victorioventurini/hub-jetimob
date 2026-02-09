/**
 * Leader Dashboard Types
 * TCR v3.4.x - Dashboard KPI Card with Real Data
 */

// Team info returned by get_leader_teams RPC
export interface LeaderTeam {
  team_id: string;
  team_name: string;
  team_description: string | null;
  parent_team_id: string | null;
  member_count: number;
}

// OKR summary from dashboard
export interface OkrSummary {
  green: number;
  yellow: number;
  red: number;
  not_started: number;
  pending_checkins: number;
}

// Ticket summary from dashboard
export interface TicketSummary {
  total_open: number;
  overdue: number;
  due_soon: number;
  awaiting_internal: number;
  awaiting_external: number;
  top: TicketItem[];
}

export interface TicketItem {
  id: string;
  title: string;
  status: string;
  type: string;
  expected_due_at: string | null;
}

// Asset summary from dashboard
export interface AssetSummary {
  active_loans: number;
  overdue: number;
  due_soon: number;
  top: AssetLoanItem[];
}

export interface AssetLoanItem {
  asset_id: string;
  name: string;
  internal_code: string;
  holder_user_id: string;
  holder_name: string;
  due_at: string | null;
}

// KPI summary from dashboard (legacy format - used by rpc_leader_dashboard_summary)
export interface KpiSummary {
  tracked_count: number;
  at_risk_count: number;
  breached_count: number;
  needs_update?: number;
  rag_summary?: RagSummary;
  top: KpiItem[];
}

// RAG Summary for KPIs
export interface RagSummary {
  green: number;
  yellow: number;
  red: number;
  gray: number;
}

export interface KpiItem {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'green' | 'yellow' | 'red';
}

// KPI Dashboard Summary (new format from rpc_kpi_dashboard_summary)
export interface KpiDashboardSummary {
  rag_summary: RagSummary;
  needs_update: number;
  total: number;
  top_critical: KpiCriticalItem[];
}

export interface KpiCriticalItem {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  unit: string;
  rag_status: 'on_track' | 'at_risk' | 'off_track' | 'no_data';
  days_since_update: number;
  owner_name: string | null;
}

// Full dashboard summary response
export interface LeaderDashboardSummary {
  team: {
    id: string;
    name: string;
  };
  okrs: OkrSummary;
  tickets: TicketSummary;
  assets: AssetSummary;
  kpis: KpiSummary;
}

// Focus item for "Hoje seu foco"
export interface FocusItem {
  type: 'warning' | 'info' | 'action';
  label: string;
  url: string | null;
  cta: string | null;
}

// Critical alert item
export interface CriticalAlertItem {
  type: 'asset_overdue' | 'ticket_overdue' | 'okr_pending' | 'kpi_breach';
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  url: string;
  cta: string;
}
