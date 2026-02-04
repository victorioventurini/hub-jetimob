/**
 * KrStateInsightCard - Card de insight baseado em estado de KR
 * 
 * Exibe insight contextual com pergunta orientadora baseada
 * no estado atual da KR (not_started, healthy, stagnant, etc.)
 * 
 * @see docs/guides/WIZARD_DEVELOPMENT_GUIDE.md
 */

import { cn } from '@/lib/utils';
import { 
  KrState, 
  KrStateConfig, 
  KR_STATE_CONFIG, 
  getKrStateConfig 
} from '../../hooks/useKrStateInsights';

// ============================================================
// TYPES
// ============================================================

export interface KrStateInsightCardProps {
  state: KrState;
  /** Optional KR context for display */
  krTitle?: string;
  /** Show guiding question (default: true) */
  showGuidingQuestion?: boolean;
  /** Additional className */
  className?: string;
  /** Compact mode for inline usage */
  compact?: boolean;
}

// ============================================================
// SEVERITY STYLES
// ============================================================

const SEVERITY_STYLES = {
  critical: {
    container: 'border-status-red/30 bg-status-red-muted',
    iconBg: 'bg-status-red/10',
  },
  warning: {
    container: 'border-status-yellow/30 bg-status-yellow-muted',
    iconBg: 'bg-status-yellow/10',
  },
  info: {
    container: 'border-muted bg-muted/50',
    iconBg: 'bg-background',
  },
} as const;

// ============================================================
// COMPONENT
// ============================================================

export function KrStateInsightCard({
  state,
  krTitle,
  showGuidingQuestion = true,
  className,
  compact = false,
}: KrStateInsightCardProps) {
  const config = getKrStateConfig(state);
  const Icon = config.icon;
  const severityStyle = SEVERITY_STYLES[config.severity];

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md text-xs",
        config.bgClass,
        className
      )}>
        <Icon className={cn("h-3 w-3", config.colorClass)} />
        <span className={config.colorClass}>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border p-4",
      severityStyle.container,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          severityStyle.iconBg
        )}>
          <Icon className={cn("h-5 w-5", config.colorClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-medium text-sm", config.colorClass)}>
              {config.label}
            </h4>
          </div>
          
          <p className="text-sm text-muted-foreground mt-0.5">
            {config.description}
          </p>
          
          {krTitle && (
            <p className="text-xs text-muted-foreground mt-1 italic truncate">
              {krTitle}
            </p>
          )}
          
          {showGuidingQuestion && (
            <p className="text-sm mt-3 font-medium">
              💡 {config.guidingQuestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INLINE VARIANT
// ============================================================

export interface KrStateInlineProps {
  state: KrState;
  className?: string;
}

/**
 * Inline state indicator for tables and lists
 */
export function KrStateInline({ state, className }: KrStateInlineProps) {
  const config = getKrStateConfig(state);
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs",
      config.colorClass,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============================================================
// STATE DISTRIBUTION
// ============================================================

export interface StateDistributionProps {
  distribution: Record<KrState, number>;
  className?: string;
}

/**
 * Visual distribution of KR states (for dashboards)
 */
export function KrStateDistribution({ distribution, className }: StateDistributionProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const statesWithCount = (Object.entries(distribution) as [KrState, number][])
    .filter(([_, count]) => count > 0)
    .sort((a, b) => {
      // Sort by severity: critical > warning > info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityA = severityOrder[KR_STATE_CONFIG[a[0]].severity];
      const severityB = severityOrder[KR_STATE_CONFIG[b[0]].severity];
      return severityA - severityB;
    });

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {statesWithCount.map(([state, count]) => {
        const config = KR_STATE_CONFIG[state];
        const Icon = config.icon;
        
        return (
          <div 
            key={state}
            className="flex items-center gap-1.5 text-sm"
            title={config.description}
          >
            <Icon className={cn("h-4 w-4", config.colorClass)} />
            <span className="font-medium">{count}</span>
            <span className="text-muted-foreground text-xs hidden sm:inline">
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
