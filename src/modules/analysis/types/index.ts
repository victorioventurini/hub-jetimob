/**
 * Tipos do módulo Análise Estratégica
 */

export type AnalysisMode = "auto" | "manual" | "mixed";
export type AnalysisDepth = "auto" | "minimal" | "standard" | "full";
export type AnalysisStatus = "pending" | "generating" | "complete" | "failed";
export type AnalysisScheduleFrequency = "weekly" | "monthly" | "per_cycle";

export type AnalysisModule =
  | "kpis"
  | "okrs"
  | "projects"
  | "checkins"
  | "wizards";

export interface AnalysisPeriod {
  /** ISO date YYYY-MM-DD */
  start: string;
  /** ISO date YYYY-MM-DD */
  end: string;
  /** Identificador legível (ex.: 'last_30_days', 'q4_2025') */
  preset?: string;
}

export interface AnalysisScope {
  teamIds?: string[];
  areaIds?: string[];
  buWide?: boolean;
}

export interface AnalysisKeyMetric {
  label: string;
  value: string;
  reference?: string;
  delta?: string;
}

export interface AnalysisInsight {
  type: "info" | "warning" | "positive";
  title: string;
  body: string;
}

export interface AnalysisSource {
  module: AnalysisModule | string;
  entityType?: string;
  entityId?: string;
  label: string;
}

export interface AnalysisSuggestedAction {
  title: string;
  rationale?: string;
  owner_hint?: string;
  due_hint?: string;
}

export interface AnalysisResultPayload {
  title?: string;
  key_metrics?: AnalysisKeyMetric[];
  insights?: AnalysisInsight[];
  body?: string;
  sources?: AnalysisSource[];
}

export interface AnalysisReport {
  id: string;
  bu_id: string;
  created_by: string;
  title: string | null;
  premise: string;
  additional_context: string | null;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  modules: string[];
  scope: AnalysisScope | Record<string, unknown>;
  period: AnalysisPeriod | Record<string, unknown>;
  status: AnalysisStatus;
  result: AnalysisResultPayload | null;
  sources: AnalysisSource[] | null;
  suggested_actions: AnalysisSuggestedAction[] | null;
  template_id: string | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisTemplate {
  id: string;
  bu_id: string | null;
  name: string;
  category: string;
  premise: string;
  defaults: {
    mode?: AnalysisMode;
    depth?: AnalysisDepth;
    modules?: string[];
    scope?: AnalysisScope;
  };
  is_admin_only: boolean;
  scope: "global" | "bu";
  display_order: number;
}

export interface AnalysisComposerState {
  premise: string;
  additionalContext: string;
  mode: AnalysisMode;
  modules: string[];
  scope: AnalysisScope;
  period: AnalysisPeriod;
  depth: AnalysisDepth;
  templateId?: string | null;
}

export interface AnalysisFeedback {
  id: string;
  report_id: string;
  user_id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

export interface AnalysisComment {
  id: string;
  report_id: string;
  bu_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}
