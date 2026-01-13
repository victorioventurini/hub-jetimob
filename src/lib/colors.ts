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
// OKR Calculated Status Styles (useOkrStatus)
// ============================================

export const OKR_CALCULATED_STATUS_STYLES = {
  on_track: {
    label: 'No Caminho',
    text: 'text-status-green-muted-foreground',
    bg: 'bg-status-green',
    border: 'border-status-green/30',
  },
  at_risk: {
    label: 'Em Risco',
    text: 'text-status-yellow-muted-foreground',
    bg: 'bg-status-yellow',
    border: 'border-status-yellow/30',
  },
  off_track: {
    label: 'Fora do Caminho',
    text: 'text-status-red-muted-foreground',
    bg: 'bg-status-red',
    border: 'border-status-red/30',
  },
  not_started: {
    label: 'Não Iniciado',
    text: 'text-status-gray-muted-foreground',
    bg: 'bg-status-gray',
    border: 'border-status-gray/30',
  },
  completed: {
    label: 'Concluído',
    text: 'text-info-muted-foreground',
    bg: 'bg-info',
    border: 'border-info/30',
  },
  dropped: {
    label: 'Descontinuado',
    text: 'text-status-gray-muted-foreground',
    bg: 'bg-status-gray/60',
    border: 'border-status-gray/20',
  },
} as const;

export type OkrCalculatedStatusKey = keyof typeof OKR_CALCULATED_STATUS_STYLES;

// ============================================
// KPI RAG Status Styles
// ============================================

export const KPI_RAG_STATUS_STYLES = {
  on_track: {
    label: 'On Track',
    text: 'text-status-green-muted-foreground',
    bg: 'bg-status-green-muted',
    progress: 'bg-status-green',
  },
  at_risk: {
    label: 'Em Risco',
    text: 'text-status-yellow-muted-foreground',
    bg: 'bg-status-yellow-muted',
    progress: 'bg-status-yellow',
  },
  off_track: {
    label: 'Off Track',
    text: 'text-status-red-muted-foreground',
    bg: 'bg-status-red-muted',
    progress: 'bg-status-red',
  },
  no_data: {
    label: 'Sem Dados',
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    progress: 'bg-muted-foreground',
  },
} as const;

export type KpiRagStatusKey = keyof typeof KPI_RAG_STATUS_STYLES;

// ============================================
// Focus Item Styles (Leader Dashboard)
// ============================================

export const FOCUS_ITEM_STYLES = {
  warning: {
    icon: 'text-status-yellow',
    bg: 'bg-status-yellow-muted',
  },
  action: {
    icon: 'text-info',
    bg: 'bg-info-muted',
  },
  info: {
    icon: 'text-muted-foreground',
    bg: 'bg-muted',
  },
} as const;

export type FocusItemType = keyof typeof FOCUS_ITEM_STYLES;

// ============================================
// KPI Category Colors
// ============================================

export const KPI_CATEGORY_COLORS = {
  financeiro: 'bg-status-green',
  growth: 'bg-info',
  cs: 'bg-[hsl(var(--violet-500))]',
  produto: 'bg-status-yellow',
  operacoes: 'bg-status-red',
  pessoas: 'bg-[hsl(var(--cyan-500))]',
} as const;

export type KpiCategoryKey = keyof typeof KPI_CATEGORY_COLORS;

// ============================================
// Progress Bar Colors (based on percentage)
// ============================================

export const PROGRESS_BAR_STYLES = {
  high: '[&>div]:bg-status-green',
  medium: '[&>div]:bg-status-yellow',
  low: '[&>div]:bg-status-red',
} as const;

export function getProgressBarStyle(progress: number): string {
  if (progress >= 70) return PROGRESS_BAR_STYLES.high;
  if (progress >= 40) return PROGRESS_BAR_STYLES.medium;
  return PROGRESS_BAR_STYLES.low;
}

export function getProgressColor(progress: number): string {
  if (progress >= 70) return 'bg-status-green';
  if (progress >= 40) return 'bg-status-yellow';
  return 'bg-status-red';
}

// ============================================
// AI Insight Colors
// ============================================

export const AI_INSIGHT_STYLES = {
  suggestion: {
    container: 'text-info bg-info-muted dark:bg-info-muted/30',
    icon: 'text-info',
  },
  warning: {
    container: 'text-status-yellow bg-status-yellow-muted dark:bg-status-yellow-muted/30',
    icon: 'text-status-yellow',
  },
  opportunity: {
    container: 'text-status-green bg-status-green-muted dark:bg-status-green-muted/30',
    icon: 'text-status-green',
  },
  tip: {
    container: 'text-[hsl(var(--violet-500))] bg-[hsl(var(--violet-500)/0.1)] dark:bg-[hsl(var(--violet-500)/0.15)]',
    icon: 'text-[hsl(var(--violet-500))]',
  },
} as const;

export type AiInsightType = keyof typeof AI_INSIGHT_STYLES;

// ============================================
// Automation Log Status Colors
// ============================================

export const AUTOMATION_LOG_STATUS_STYLES = {
  success: 'text-status-green bg-status-green-muted',
  error: 'text-status-red bg-status-red-muted',
  pending: 'text-status-yellow bg-status-yellow-muted',
  retrying: 'text-status-yellow bg-status-yellow-muted',
} as const;

export type AutomationLogStatusKey = keyof typeof AUTOMATION_LOG_STATUS_STYLES;

// ============================================
// Trend Colors
// ============================================

export const TREND_COLORS = {
  up: 'text-status-green',
  down: 'text-status-red',
  flat: 'text-muted-foreground',
  improving: 'text-status-green',
  declining: 'text-status-red',
  stable: 'text-muted-foreground',
} as const;

export type TrendKey = keyof typeof TREND_COLORS;

// ============================================
// Configuration Status Colors (for setup pages)
// ============================================

export const CONFIG_STATUS_STYLES = {
  configured: {
    card: 'border-status-green/50 bg-status-green-muted',
    icon: 'text-status-green',
    text: 'text-status-green',
  },
  pending: {
    card: 'border-status-yellow/50 bg-status-yellow-muted',
    icon: 'text-status-yellow',
    text: 'text-status-yellow',
  },
} as const;

export type ConfigStatusKey = keyof typeof CONFIG_STATUS_STYLES;

// ============================================
// Alert Banner Colors (Wizards)
// ============================================

export const ALERT_BANNER_STYLES = {
  overdue: {
    bg: 'border-status-yellow/50 bg-status-yellow-muted/50 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
  no_update: {
    bg: 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10',
    icon: 'text-destructive',
  },
  blocked: {
    bg: 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10',
    icon: 'text-destructive',
  },
  at_risk: {
    bg: 'border-status-yellow/50 bg-status-yellow-muted/50 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
  stagnant: {
    bg: 'border-status-yellow/50 bg-status-yellow-muted/50 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
  info: {
    bg: 'border-primary/30 bg-primary/5 dark:bg-primary/10',
    icon: 'text-primary',
  },
  warning: {
    bg: 'border-status-yellow/50 bg-status-yellow-muted/50 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
  success: {
    bg: 'border-status-green/50 bg-status-green-muted/50 dark:bg-status-green-muted/20',
    icon: 'text-status-green',
  },
} as const;

export type AlertBannerType = keyof typeof ALERT_BANNER_STYLES;

// ============================================
// Highlight Card Colors (Leader Prep Wizard)
// ============================================

export const HIGHLIGHT_CARD_STYLES = {
  stagnant: {
    card: 'border-[hsl(var(--violet-200))] bg-[hsl(var(--violet-50))] dark:border-[hsl(var(--violet-800)/0.5)] dark:bg-[hsl(var(--violet-950)/0.2)]',
    icon: 'text-[hsl(var(--violet-600))] dark:text-[hsl(var(--violet-400))]',
  },
  blocked: {
    card: 'border-status-red/30 bg-status-red-muted dark:border-status-red/30 dark:bg-status-red-muted/20',
    icon: 'text-status-red',
  },
  initiative_impact: {
    card: 'border-info/30 bg-info-muted dark:border-info/30 dark:bg-info-muted/20',
    icon: 'text-info',
  },
  help_requested: {
    card: 'border-status-yellow/30 bg-status-yellow-muted dark:border-status-yellow/30 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
  overdue: {
    card: 'border-status-yellow/30 bg-status-yellow-muted dark:border-status-yellow/30 dark:bg-status-yellow-muted/20',
    icon: 'text-status-yellow',
  },
} as const;

export type HighlightCardType = keyof typeof HIGHLIGHT_CARD_STYLES;

// ============================================
// Metric Card Colors (Leader Overview)
// ============================================

export const METRIC_CARD_STYLES = {
  success: {
    card: 'border-status-green/30 dark:border-status-green/30',
    iconBg: 'bg-status-green-muted dark:bg-status-green-muted/30',
    icon: 'text-status-green',
  },
  warning: {
    card: 'border-status-yellow/30 dark:border-status-yellow/30',
    iconBg: 'bg-status-yellow-muted dark:bg-status-yellow-muted/30',
    icon: 'text-status-yellow',
  },
  danger: {
    card: 'border-status-red/30 dark:border-status-red/30',
    iconBg: 'bg-status-red-muted dark:bg-status-red-muted/30',
    icon: 'text-status-red',
  },
  info: {
    card: 'border-info/30 dark:border-info/30',
    iconBg: 'bg-info-muted dark:bg-info-muted/30',
    icon: 'text-info',
  },
  purple: {
    card: 'border-[hsl(var(--violet-200))] dark:border-[hsl(var(--violet-800)/0.5)]',
    iconBg: 'bg-[hsl(var(--violet-100))] dark:bg-[hsl(var(--violet-900)/0.3)]',
    icon: 'text-[hsl(var(--violet-600))] dark:text-[hsl(var(--violet-400))]',
  },
  neutral: {
    card: '',
    iconBg: 'bg-muted',
    icon: 'text-muted-foreground',
  },
} as const;

export type MetricCardType = keyof typeof METRIC_CARD_STYLES;

// ============================================
// Timeline Event Colors
// ============================================

export const TIMELINE_EVENT_COLORS = {
  created: 'bg-info',
  activated: 'bg-status-green',
  reviewed: 'bg-[hsl(var(--violet-500))]',
  updated: 'bg-status-yellow',
  cancelled: 'bg-status-red',
  completed: 'bg-status-green',
  discarded: 'bg-muted-foreground',
} as const;

export type TimelineEventType = keyof typeof TIMELINE_EVENT_COLORS;

// ============================================
// Cycle Summary Colors
// ============================================

export const CYCLE_SUMMARY_COLORS = {
  achieved: 'text-status-green',
  partial: 'text-status-yellow',
  not_achieved: 'text-status-red',
} as const;

// ============================================
// Health Score Colors
// ============================================

export function getHealthScoreColor(score: number): { text: string; progress: string } {
  if (score >= 70) return { text: 'text-status-green', progress: '[&>div]:bg-status-green' };
  if (score >= 40) return { text: 'text-status-yellow', progress: '[&>div]:bg-status-yellow' };
  return { text: 'text-status-red', progress: '[&>div]:bg-status-red' };
}

// ============================================
// KPI Trend Colors (with direction consideration)
// ============================================

export function getKpiTrendColor(trend: 'up' | 'down' | 'flat' | 'stable' | null, direction: 'up' | 'down'): string {
  if (!trend || trend === 'flat' || trend === 'stable') return 'text-muted-foreground';
  
  // When direction is 'up', going up is good. When direction is 'down', going down is good.
  const isGood = direction === 'up' ? trend === 'up' : trend === 'down';
  return isGood ? 'text-status-green' : 'text-status-red';
}

// ============================================
// External Mention Colors
// ============================================

export const MENTION_COLORS = {
  external: 'bg-status-yellow-muted/50 text-status-yellow dark:text-status-yellow',
  internal: 'bg-primary/15 text-primary',
} as const;

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
