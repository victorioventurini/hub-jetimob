/**
 * Tipos do módulo Análise Estratégica
 */

export type AnalysisStatus = "pending" | "generating" | "complete" | "failed";
export type AnalysisMode = "auto" | "manual" | "mixed";
export type AnalysisDepth = "auto" | "minimal" | "standard" | "full";

/**
 * Coage valores legados (quick/deep) para o vocabulário canônico do banco
 * (enum `analysis_depth` = auto|minimal|standard|full).
 */
export function coerceAnalysisDepth(value: unknown): AnalysisDepth {
  if (value === "quick") return "minimal";
  if (value === "deep") return "full";
  if (value === "auto" || value === "minimal" || value === "standard" || value === "full") {
    return value;
  }
  return "standard";
}
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
  /** Autor (resolvido via join com v_profiles_directory) */
  author?: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
  } | null;
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
  /** Texto puro (compat retroativa) */
  body: string;
  /** Conteúdo richtext (novo) — ex.: { type: 'text', content: '...' } */
  body_richtext?: Record<string, unknown> | string | null;
  /** Resposta a outro comentário */
  reply_to_comment_id?: string | null;
  /** Mensagem fixada */
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by_user_id?: string | null;
  edited_at?: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  /** Comentário citado, quando é uma resposta */
  reply_to?: {
    id: string;
    body: string | null;
    body_richtext?: Record<string, unknown> | string | null;
    author?: { id: string; display_name: string | null } | null;
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
