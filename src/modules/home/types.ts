/**
 * Leader Dashboard Types
 * TCR v2.4.0 - Leader Dashboard Evolution
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

// KPI summary from dashboard
export interface KpiSummary {
  tracked_count: number;
  at_risk_count: number;
  breached_count: number;
  top: KpiItem[];
}

export interface KpiItem {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'green' | 'yellow' | 'red';
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
