/**
 * Tipos do módulo Análise Estratégica
 */

export type AnalysisStatus = "pending" | "generating" | "complete" | "failed";
export type AnalysisMode = "auto" | "manual" | "mixed";
export type AnalysisDepth = "quick" | "standard" | "deep";
export type AnalysisModule =
  | "kpis"
  | "okrs"
  | "projects"
  | "initiatives"
  | "checkins"
  | "wizards";

export interface AnalysisPeriod {
  start: string;
  end: string;
  label?: string;
}

export interface AnalysisScope {
  team_ids?: string[];
  area_ids?: string[];
  user_ids?: string[];
}

export interface AnalysisSource {
  module: string;
  label?: string;
  count?: number;
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

export type AnalysisSuggestedActionType = "open_resource" | "register_decision";

export interface AnalysisSuggestedAction {
  /** Tipo da ação sugerida pela IA */
  type?: AnalysisSuggestedActionType;
  /** Rótulo curto exibido no card (shape novo da IA) */
  label?: string;
  /** Categoria sugerida quando type='register_decision' */
  suggestedCategory?: string;
  /** Texto sugerido para a decisão */
  suggestedText?: string;
  /** Entidade alvo quando type='open_resource' */
  entity?: string;
  /** ID da entidade alvo (pode ser null) */
  entityId?: string | null;

  /** @deprecated shape antigo — manter para compat retroativa de relatórios */
  title?: string;
  /** @deprecated shape antigo */
  rationale?: string;
  /** @deprecated shape antigo */
  owner_hint?: string;
  /** @deprecated shape antigo */
  due_hint?: string;
  /** @deprecated shape antigo */
  impact?: "low" | "medium" | "high";
}

export interface AnalysisResultPayload {
  title?: string;
  summary?: string;
  body?: string;
  key_metrics?: AnalysisKeyMetric[];
  insights?: AnalysisInsight[];
}

export interface AnalysisReport {
  id: string;
  bu_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  status: AnalysisStatus;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  modules: string[];
  period: AnalysisPeriod;
  scope: AnalysisScope;
  premise: string;
  additional_context: string | null;
  title: string | null;
  template_id: string | null;
  result: AnalysisResultPayload | null;
  sources: AnalysisSource[] | null;
  suggested_actions: AnalysisSuggestedAction[] | null;
  error_message: string | null;
}

export interface AnalysisTemplate {
  id: string;
  bu_id: string | null;
  name: string;
  category: string;
  premise: string;
  scope: "global" | "bu";
  defaults: Record<string, unknown>;
  is_admin_only: boolean;
  display_order: number;
}

export interface AnalysisComment {
  id: string;
  report_id: string;
  bu_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AnalysisFeedback {
  id: string;
  report_id: string;
  user_id: string;
  bu_id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

export interface AnalysisComposerState {
  premise: string;
  additional_context: string;
  mode: AnalysisMode;
  modules: AnalysisModule[];
  scope: AnalysisScope;
  period: AnalysisPeriod;
  depth: AnalysisDepth;
  template_id?: string;
}

export interface GenerateAnalysisInput {
  premise: string;
  additional_context?: string;
  mode: AnalysisMode;
  modules: string[];
  scope: AnalysisScope;
  period: AnalysisPeriod;
  depth: AnalysisDepth;
  template_id?: string;
  title?: string;
}
