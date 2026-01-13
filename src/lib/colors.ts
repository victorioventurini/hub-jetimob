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
// Helper function for dynamic status lookup
// ============================================

export function getStatusStyle<T extends Record<string, { badge: string; dot?: string }>>(
  styles: T,
  status: keyof T | string,
  fallback: keyof T
): T[keyof T] {
  return styles[status as keyof T] || styles[fallback];
}
