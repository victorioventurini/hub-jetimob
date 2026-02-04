/**
 * OKR Insights Components - Barrel Export
 * 
 * Componentes centralizados para exibição de insights de KRs e OKRs.
 * Usados em wizards, dashboards e páginas de detalhes.
 * 
 * @see docs/guides/WIZARD_DEVELOPMENT_GUIDE.md
 */

// KR State Insight Components
export { 
  KrStateInsightCard, 
  KrStateInline, 
  KrStateDistribution 
} from './KrStateInsightCard';
export type { 
  KrStateInsightCardProps, 
  KrStateInlineProps, 
  StateDistributionProps 
} from './KrStateInsightCard';

// Re-export hook utilities for convenience
export { 
  calculateKrState, 
  getKrStateConfig,
  groupKrStatesBySeverity,
  filterKrsRequiringAttention,
  filterKrsForCelebration,
  sortByStatePriority,
  KR_STATE_CONFIG,
  KR_STATE_PRIORITY_ORDER,
} from '../../hooks/useKrStateInsights';
export type { 
  KrState, 
  KrStateConfig, 
  KrStateSeverity,
  CalculateKrStateParams,
} from '../../hooks/useKrStateInsights';
