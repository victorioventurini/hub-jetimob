// Shared types for analysis-generate

export type AnalysisMode = "auto" | "manual" | "mixed";
export type AnalysisDepth = "auto" | "minimal" | "standard" | "full";

export interface KpiRow {
  id: string; name: string; unit?: string | null; target_value?: number | null;
  direction?: string | null; scope?: string | null; created_at?: string;
}
export interface KpiValueRow {
  kpi_id: string; reference_date: string; value: number | null; rag_status?: string | null;
}
export interface KpisModule { kpis: KpiRow[]; values: KpiValueRow[] }

export interface OkrObjRow {
  id: string; title: string; description?: string | null; team_id?: string | null;
  cycle_id?: string | null; status?: string | null; progress?: number | null;
}
export interface OkrKrRow {
  id: string; title: string; team_objective_id: string; baseline?: number | null;
  target?: number | null; current_value?: number | null; unit?: string | null; status?: string | null;
}
export interface OkrsModule { teamObjectives: OkrObjRow[]; teamKrs: OkrKrRow[]; orgObjectives: OkrObjRow[] }

export interface ProjectRow {
  id: string; name: string; description?: string | null; status?: string | null;
  start_date?: string | null; due_date?: string | null; owner_id?: string | null;
}
export interface InitiativeRow {
  id: string; name: string; status?: string | null; owner_user_id?: string | null;
  kr_id?: string | null; expected_end_date?: string | null; progress?: number | null;
}
export interface ProjectsModule { projects: ProjectRow[]; initiatives: InitiativeRow[] }

export interface CheckinRow {
  id: string; kr_id?: string | null; current_value?: number | null; previous_value?: number | null;
  confidence?: number | null; blockers?: string | null; comments?: string | null;
  created_at: string; user_id?: string | null; team_id?: string | null;
}
export interface WizardRow {
  id: string; wizard_type: string; team_id?: string | null; cycle_id?: string | null;
  status?: string | null; reflection_data?: unknown; created_at: string; completed_at?: string | null;
}

export interface StrategicJSON {
  title?: string;
  key_metrics?: unknown[];
  insights?: unknown[];
  body?: string;
  sources?: Array<{ module: string; entityType: string; entityId?: string; label: string }>;
}

export interface ActionItem {
  type?: string;
  label?: string;
  entity?: string;
  entityId?: string | null;
  [key: string]: unknown;
}

export interface GenerateRequest {
  bu_id: string;
  premise: string;
  additional_context?: string | null;
  mode: AnalysisMode;
  modules: string[];
  scope: { type: "bu" | "team"; team_id?: string | null };
  period: { type: "current_cycle" | "last_30d" | "previous_cycle" | "compare_cycles"; cycle_id?: string | null };
  depth: AnalysisDepth;
  template_id?: string | null;
}

export interface CollectedData {
  kpis?: KpisModule;
  okrs?: OkrsModule;
  projects?: ProjectsModule;
  initiatives?: InitiativeRow[];
  checkins?: CheckinRow[];
  wizards?: WizardRow[];
}

export interface PeriodWindow { from: string; to: string }
