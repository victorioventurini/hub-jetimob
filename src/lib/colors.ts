/**
 * Semantic color tokens for status indicators
 * Use these instead of hardcoded Tailwind colors for consistent theming
 * 
 * @example
 * // RAG Status
 * <span className={RAG_STATUS_COLORS.green.dot} />
 * <Badge className={RAG_STATUS_COLORS.yellow.badge}>Em Risco</Badge>
 * 
 * // Permission Surfaces
 * <Badge className={SURFACE_COLORS.view}>VIEW</Badge>
 * 
 * // Ticket Status
 * <Badge className={TICKET_STATUS_STYLES.done}>Concluído</Badge>
 */

// ============================================
// RAG Status Colors (OKRs, KPIs)
// ============================================

export const RAG_STATUS_COLORS = {
  green: {
    dot: 'bg-status-green',
    text: 'text-status-green',
    badge: 'bg-status-green-muted text-status-green-muted-foreground',
    border: 'border-status-green/30',
  },
  yellow: {
    dot: 'bg-status-yellow',
    text: 'text-status-yellow',
    badge: 'bg-status-yellow-muted text-status-yellow-muted-foreground',
    border: 'border-status-yellow/30',
  },
  red: {
    dot: 'bg-status-red',
    text: 'text-status-red',
    badge: 'bg-status-red-muted text-status-red-muted-foreground',
    border: 'border-status-red/30',
  },
  not_started: {
    dot: 'bg-status-gray',
    text: 'text-muted-foreground',
    badge: 'bg-status-gray-muted text-status-gray-muted-foreground',
    border: 'border-status-gray/30',
  },
} as const;

export type RagStatus = keyof typeof RAG_STATUS_COLORS;

// ============================================
// Confidence Colors (Check-ins)
// ============================================

export const CONFIDENCE_COLORS = {
  high: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground',
    selected: 'border-status-green bg-status-green-muted text-status-green-muted-foreground',
  },
  medium: {
    badge: 'bg-status-yellow-muted text-status-yellow-muted-foreground',
    selected: 'border-status-yellow bg-status-yellow-muted text-status-yellow-muted-foreground',
  },
  low: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground',
    selected: 'border-status-red bg-status-red-muted text-status-red-muted-foreground',
  },
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_COLORS;

// ============================================
// Health Status Colors (OKR Health Score)
// ============================================

export const HEALTH_STATUS_COLORS = {
  healthy: {
    text: 'text-status-green',
    bg: 'bg-status-green-muted',
    border: 'border-status-green',
  },
  attention: {
    text: 'text-status-yellow',
    bg: 'bg-status-yellow-muted',
    border: 'border-status-yellow',
  },
  risk: {
    text: 'text-status-red',
    bg: 'bg-status-red-muted',
    border: 'border-status-red',
  },
  at_risk: {
    text: 'text-status-yellow',
    bg: 'bg-status-yellow-muted',
    border: 'border-status-yellow',
  },
  critical: {
    text: 'text-status-red',
    bg: 'bg-status-red-muted',
    border: 'border-status-red',
  },
} as const;

export type HealthStatusKey = keyof typeof HEALTH_STATUS_COLORS;

// ============================================
// Permission Surface Colors
// ============================================

export const SURFACE_COLORS = {
  view: {
    badge: 'bg-surface-view-muted text-surface-view-muted-foreground',
    border: 'border-surface-view/30',
    full: 'bg-surface-view-muted text-surface-view-muted-foreground border-surface-view/30',
  },
  operate: {
    badge: 'bg-surface-operate-muted text-surface-operate-muted-foreground',
    border: 'border-surface-operate/30',
    full: 'bg-surface-operate-muted text-surface-operate-muted-foreground border-surface-operate/30',
  },
  administer: {
    badge: 'bg-surface-administer-muted text-surface-administer-muted-foreground',
    border: 'border-surface-administer/30',
    full: 'bg-surface-administer-muted text-surface-administer-muted-foreground border-surface-administer/30',
  },
  base: {
    badge: 'bg-muted text-muted-foreground',
    border: 'border-muted',
    full: 'bg-muted text-muted-foreground border-muted',
  },
  restricted: {
    badge: 'bg-surface-restricted-muted text-surface-restricted-muted-foreground',
    border: 'border-surface-restricted/30',
    full: 'bg-surface-restricted-muted text-surface-restricted-muted-foreground border-surface-restricted/30',
  },
} as const;

export type PermissionSurface = keyof typeof SURFACE_COLORS;

// ============================================
// Ticket Status Colors
// ============================================

export const TICKET_STATUS_STYLES = {
  waiting: {
    badge: 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/20',
    dot: 'bg-status-yellow',
  },
  paused: {
    badge: 'bg-status-gray-muted text-status-gray-muted-foreground border-status-gray/20',
    dot: 'bg-status-gray',
  },
  in_progress: {
    badge: 'bg-info-muted text-info-muted-foreground border-info/20',
    dot: 'bg-info',
  },
  done: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
    dot: 'bg-status-green',
  },
  discarded: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground border-status-red/20',
    dot: 'bg-status-red',
  },
} as const;

export type TicketStatusKey = keyof typeof TICKET_STATUS_STYLES;

// ============================================
// Asset Status Colors
// ============================================

export const ASSET_STATUS_STYLES = {
  available: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
    dot: 'bg-status-green',
  },
  loaned: {
    badge: 'bg-info-muted text-info-muted-foreground border-info/20',
    dot: 'bg-info',
  },
  lost: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground border-status-red/20',
    dot: 'bg-status-red',
  },
  retired: {
    badge: 'bg-status-gray-muted text-status-gray-muted-foreground border-status-gray/20',
    dot: 'bg-status-gray',
  },
} as const;

export type AssetStatusKey = keyof typeof ASSET_STATUS_STYLES;

// ============================================
// Feedback Types (AI validation, alerts)
// ============================================

export const FEEDBACK_STYLES = {
  warning: {
    container: 'bg-status-yellow-muted border-status-yellow/30',
    icon: 'text-status-yellow',
    text: 'text-status-yellow-muted-foreground',
  },
  suggestion: {
    container: 'bg-info-muted border-info/30',
    icon: 'text-info',
    text: 'text-info-muted-foreground',
  },
  success: {
    container: 'bg-status-green-muted border-status-green/30',
    icon: 'text-status-green',
    text: 'text-status-green-muted-foreground',
  },
} as const;

export type FeedbackType = keyof typeof FEEDBACK_STYLES;

// ============================================
// Audit Status Colors
// ============================================

export const AUDIT_STATUS_STYLES = {
  PASS: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground',
  },
  FAIL: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground',
  },
  PARTIAL: {
    badge: 'bg-status-yellow-muted text-status-yellow-muted-foreground',
  },
} as const;

export type AuditStatus = keyof typeof AUDIT_STATUS_STYLES;

// ============================================
// OKR Health Status (on_track, at_risk, off_track)
// ============================================

export const OKR_HEALTH_STYLES = {
  on_track: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
    progress: '[&>div]:bg-status-green',
  },
  at_risk: {
    badge: 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/20',
    progress: '[&>div]:bg-status-yellow',
  },
  off_track: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground border-status-red/20',
    progress: '[&>div]:bg-status-red',
  },
} as const;

export type OkrHealthStatus = keyof typeof OKR_HEALTH_STYLES;

// ============================================
// Initiative Status Colors
// ============================================

export const INITIATIVE_STATUS_COLORS = {
  planned: {
    badge: 'bg-muted text-muted-foreground',
  },
  in_progress: {
    badge: 'bg-surface-view-muted text-surface-view-muted-foreground',
  },
  blocked: {
    badge: 'bg-status-red-muted text-status-red-muted-foreground',
  },
  completed: {
    badge: 'bg-status-green-muted text-status-green-muted-foreground',
  },
} as const;

export type InitiativeStatusKey = keyof typeof INITIATIVE_STATUS_COLORS;

// ============================================
// Helper function for dynamic status lookup
// ============================================

export function getStatusStyle<T extends Record<string, { badge: string; dot?: string }>>(
  styles: T,
  status: keyof T | string,
  fallback: keyof T
): T[keyof T] {
  return styles[status as keyof T] || styles[fallback];
}
