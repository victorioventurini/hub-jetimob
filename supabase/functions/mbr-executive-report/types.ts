// ============================================================================
// MBR Executive Report — domain types
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

export interface MbrSessionRow {
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

export interface TeamCommitment {
  teamName: string;
  focus: string;
  prioritizedItems: string[];
  crossDependencies: string[];
}

export interface TeamMonthlyHighlight {
  teamName: string;
  accelerated: string;
  blocked: string;
  needsDecision: string;
}

export interface ProjectIssue {
  teamName: string;
  /** 'project' = atraso/risco no projeto inteiro; 'milestone' = um marco. */
  kind: 'project' | 'milestone';
  refId: string;
  /** Nome do projeto (para 'project') ou do marco (para 'milestone'). */
  name?: string;
  /** Nome do projeto pai quando kind = 'milestone'. */
  projectName?: string;
  justification: string;
}

export interface KrIssue {
  teamName: string;
  krId: string;
  /** Título do KR (preenchido pelo enrich no index). */
  title?: string;
  /** 'justified' = líder explicou RAG ≠ verde; */
  kind: 'justified';
  paceStatus?: string | null;
  finalProgress?: number | null;
  state?: string | null;
  justification: string;
}

export interface KpiIssue {
  teamName: string;
  kpiId: string;
  /** 'justified' = RAG ≠ verde com justificativa; 'no_data' = sem leitura no mês. */
  kind: 'justified' | 'no_data';
  text: string;
}

export interface KpiToCreateSuggestion {
  teamName: string;
  description: string;
  suggestedScope: string;
}

export interface AgendaSuggestionItem {
  teamName: string;
  text: string;
}

export interface MonthAnalysisSummary {
  teamName: string;
  summary: string;
  offenders: string[];
  risks: string[];
  recommendations: string[];
}

export interface ParsedReport {
  monthNarrative?: string;
  commitmentsAnalysis?: string;
  kpiInsights?: { healthy?: string; atRisk?: string; critical?: string };
  decisionsNeeded?: string[];
  projectsAnalysis?: string;
  krIssuesAnalysis?: string;
  leaderSignals?: string;
}

export interface ReportRequest {
  cycleId: string;
  monthRef: string; // YYYY-MM
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
  monthRef: string;
  monthNarrative: string;
  commitmentsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamCommitments: TeamCommitment[];
  teamHighlights: TeamMonthlyHighlight[];
  projectsAnalysis: string;
  krIssuesAnalysis: string;
  leaderSignals: string;
  projectIssues: ProjectIssue[];
  krIssues: KrIssue[];
  kpiIssues: KpiIssue[];
  kpisToCreate: KpiToCreateSuggestion[];
  agendaSuggestions: AgendaSuggestionItem[];
  monthAnalyses: MonthAnalysisSummary[];
  overallAchievement: OverallAchievement;
  analyzedTeams: AnalyzedTeam[];
  /** Snapshot factual dos KPIs até o fim do mês (para auditoria / fallback UI). */
  kpisSummary?: Array<{
    name?: string;
    category?: string | null;
    unit?: string | null;
    direction?: string | null;
    targetValue?: number | string | null;
    currentValue?: number | string | null;
    ragStatus?: string | null;
    periodLabel?: string | null;
  }>;
}

