// ============================================================================
// QBR Executive Report — domain types
// ============================================================================

export interface KrRow {
  id?: string;
  baseline?: number | string | null;
  current_value?: number | string | null;
  target?: number | string | null;
  direction?: string | null;
  status?: string | null;
  unit?: string | null;
  deleted_at?: string | null;
  cancelled_at?: string | null;
  title?: string;
  /** Valor efetivo da KPI primária (preenchido pelo data-loader quando aplicável). */
  effective_current_value?: number | null;
}

export interface TeamObjectiveRow {
  id?: string;
  title?: string;
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
  completed_at?: string | null;
  started_by?: string | null;
}

export interface AnalyzedTeam {
  teamId: string;
  teamName: string;
  leaderName: string | null;
  completedAt: string | null;
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

export interface ObjectiveAchievement {
  id: string;
  title: string;
  teamName: string;
  progress: number;
  krCount: number;
}

export interface TeamAchievement {
  teamId: string;
  teamName: string;
  progress: number;
  objectivesCount: number;
  krCount: number;
}

export interface OverallAchievement {
  overallProgress: number;
  byTeam: TeamAchievement[];
  byObjective: ObjectiveAchievement[];
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
  overallAchievement: OverallAchievement;
  analyzedTeams: AnalyzedTeam[];
}
