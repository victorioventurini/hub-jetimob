// ============================================================================
// QBR Executive Report — domain types
// ============================================================================

export interface KrRow {
  baseline?: number | string | null;
  current_value?: number | string | null;
  target?: number | string | null;
  direction?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  cancelled_at?: string | null;
  title?: string;
}

export interface TeamObjectiveRow {
  team_id: string;
  key_results?: KrRow[];
}

export interface KpiValueRow {
  value?: number | null;
  rag_status?: string | null;
  period_label?: string | null;
  reference_date?: string | null;
  created_at?: string | null;
}

export interface KpiRow {
  name: string;
  category?: string | null;
  unit?: string | null;
  direction?: string | null;
  target_value?: number | null;
  values?: KpiValueRow[];
}

export interface SessionRow {
  team_id: string;
  reflection_data?: { data?: Record<string, unknown> } | Record<string, unknown> | null;
}

export interface OrgObjectiveRow {
  title: string;
  key_results?: KrRow[];
}

export interface ParsedReport {
  quarterNarrative?: string;
  proposalsAnalysis?: string;
  kpiInsights?: { healthy?: string; atRisk?: string; critical?: string };
  decisionsNeeded?: string[];
}

export interface ReportRequest {
  cycleId: string;
}

export interface TeamProposal {
  teamName: string;
  objectiveTitle: string;
  krCount: number;
  krs: string[];
}

export interface ReportResponse {
  quarterNarrative: string;
  proposalsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamProposals: TeamProposal[];
}
