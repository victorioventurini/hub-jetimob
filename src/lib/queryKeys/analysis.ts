/**
 * Analysis Query Keys
 */

export const analysisKeys = {
  // ── Prefix helpers ──
  allPrefix: () => ["analysis"] as const,
  listPrefix: () => ["analysis", "list"] as const,
  templatesPrefix: () => ["analysis", "templates"] as const,

  // ── Specific keys ──
  list: (buId: string | null, filters?: Record<string, unknown>) =>
    ["analysis", "list", buId, filters] as const,
  /**
   * BU-scoped detail key — inclui buId para evitar reuso de cache cross-BU.
   * Use detailPrefix(id) para invalidar todas as variantes.
   */
  detail: (id: string, buId?: string | null) => ["analysis", "detail", id, buId ?? null] as const,
  detailPrefix: (id: string) => ["analysis", "detail", id] as const,
  templates: (buId: string | null) =>
    ["analysis", "templates", buId] as const,
  feedback: (reportId: string) =>
    ["analysis", "feedback", reportId] as const,
  comments: (reportId: string) =>
    ["analysis", "comments", reportId] as const,
  shareLog: (reportId: string) =>
    ["analysis", "share-log", reportId] as const,

  // ── Comments / Decisions ──
  commentsPrefix: (reportId: string) =>
    ["analysis", "comments", reportId] as const,
  decisions: (reportId: string) =>
    ["analysis", "decisions", reportId] as const,
  decisionsPrefix: (reportId: string) =>
    ["analysis", "decisions", reportId] as const,
};
