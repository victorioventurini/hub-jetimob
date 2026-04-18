/**
 * Analysis Query Keys
 *
 * Padrão: ['analysis', entity, buId, ...filters]
 * Helpers de prefixo para invalidação ampla.
 */

export interface AnalysisHistoryFilters {
  search?: string;
  status?: string;
  authorId?: string;
}

export const analysisKeys = {
  // ── Prefix helpers ──
  allPrefix: () => ["analysis"] as const,
  reportsPrefix: () => ["analysis", "reports"] as const,
  templatesPrefix: () => ["analysis", "templates"] as const,
  feedbackPrefix: () => ["analysis", "feedback"] as const,
  commentsPrefix: () => ["analysis", "comments"] as const,
  schedulesPrefix: () => ["analysis", "schedules"] as const,

  // ── Specific keys ──
  history: (buId: string | null, filters?: AnalysisHistoryFilters) =>
    ["analysis", "reports", "history", buId, filters] as const,

  report: (reportId: string) =>
    ["analysis", "reports", "detail", reportId] as const,

  templates: (buId: string | null) =>
    ["analysis", "templates", buId] as const,

  feedback: (reportId: string) =>
    ["analysis", "feedback", reportId] as const,

  comments: (reportId: string) =>
    ["analysis", "comments", reportId] as const,

  schedules: (buId: string | null) =>
    ["analysis", "schedules", buId] as const,
};
