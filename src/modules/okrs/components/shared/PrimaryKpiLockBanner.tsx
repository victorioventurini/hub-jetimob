/**
 * PrimaryKpiLockBanner - Banner explicativo para KRs com KPI primária
 * 
 * Exibe mensagem clara e educativa quando uma KR tem o valor bloqueado
 * por ter uma KPI primária vinculada. Inclui:
 * - Explicação do motivo (fonte única de verdade)
 * - Valor atual da KPI
 * - Link direto para atualizar a KPI
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md
 */

import { Link } from 'react-router-dom';
import { Lock, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { PrimaryKpiData } from '../../hooks/usePrimaryKpiForKr';

// ============================================================
// TYPES
// ============================================================

export interface PrimaryKpiLockBannerProps {
  /** Dados da KPI primária */
  primaryKpi: PrimaryKpiData;
  /** Variante visual */
  variant?: 'default' | 'compact' | 'inline';
  /** Classe adicional */
  className?: string;
  /** Se deve mostrar o link para a KPI */
  showLink?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  return `${value.toLocaleString('pt-BR')}${unit ? ` ${unit}` : ''}`;
}

function getRagBadgeClass(status: string): string {
  switch (status) {
    case 'green':
      return RAG_STATUS_COLORS.green.badge;
    case 'yellow':
      return RAG_STATUS_COLORS.yellow.badge;
    case 'red':
      return RAG_STATUS_COLORS.red.badge;
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getRagLabel(status: string): string {
  switch (status) {
    case 'green':
      return 'Na meta';
    case 'yellow':
      return 'Em atenção';
    case 'red':
      return 'Fora da meta';
    default:
      return 'Sem dados';
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function PrimaryKpiLockBanner({
  primaryKpi,
  variant = 'default',
  className,
  showLink = true,
}: PrimaryKpiLockBannerProps) {
  const DirectionIcon = primaryKpi.direction === 'up' 
    ? TrendingUp 
    : primaryKpi.direction === 'down' 
      ? TrendingDown 
      : Minus;

  // Compact inline variant (for form fields)
  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}>
        <Lock className="h-3.5 w-3.5 text-info" />
        <span>
          Valor atualizado pela KPI "{primaryKpi.kpiName}"
        </span>
        {showLink && (
          <Link
            to={`/kpis?kpi=${primaryKpi.kpiId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Abrir KPI
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }

  // Compact variant (for cards)
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg",
        "bg-info-muted border border-info/30",
        className
      )}>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-info shrink-0" />
          <span className="text-sm">
            Medido pela KPI <strong>{primaryKpi.kpiName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {formatValue(primaryKpi.currentValue, primaryKpi.kpiUnit)}
          </span>
          <Badge className={cn("text-xs", getRagBadgeClass(primaryKpi.ragStatus))}>
            {getRagLabel(primaryKpi.ragStatus)}
          </Badge>
        </div>
      </div>
    );
  }

  // Default variant (full banner)
  return (
    <div className={cn(
      "rounded-lg border bg-info-muted/50 border-info/30 p-4 space-y-3",
      className
    )}>
      {/* Header with lock icon */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-info/10">
          <Lock className="h-5 w-5 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">
            Esta KR é medida pela KPI "{primaryKpi.kpiName}"
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            O valor é atualizado automaticamente com base na KPI primária vinculada.
            Para alterar este número, atualize a KPI correspondente.
          </p>
        </div>
      </div>

      {/* KPI current state */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
        <div className="flex items-center gap-3">
          <DirectionIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Valor atual da KPI</p>
            <p className="font-semibold">
              {formatValue(primaryKpi.currentValue, primaryKpi.kpiUnit)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-medium">
            {formatValue(primaryKpi.targetValue, primaryKpi.kpiUnit)}
          </p>
        </div>
        <Badge className={cn("shrink-0", getRagBadgeClass(primaryKpi.ragStatus))}>
          {getRagLabel(primaryKpi.ragStatus)}
        </Badge>
      </div>

      {/* Link to KPI */}
      {showLink && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full"
        >
          <Link
            to={`/kpis?kpi=${primaryKpi.kpiId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Atualizar KPI
          </Link>
        </Button>
      )}
    </div>
  );
}
