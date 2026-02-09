/**
 * KrPrimaryKpiBadge - Badge compacto para indicar KPI primária em listagens de KR
 * 
 * Exibe um indicador visual sutil quando uma KR tem KPI primária vinculada.
 * Usado em listagens, cards e dashboards para sinalizar que o progresso
 * da KR é calculado automaticamente a partir do indicador.
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md (Seção KPI-KR Linking)
 * @see memory/features/kpis/primary-kpi-single-source-truth
 * @version 3.4.2
 */

import { Link } from 'react-router-dom';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface KrPrimaryKpiBadgeProps {
  /** Nome da KPI (para tooltip) */
  kpiName?: string;
  /** ID da KPI (para link) */
  kpiId?: string;
  /** Variante visual */
  variant?: 'icon-only' | 'compact' | 'full';
  /** Direção da KPI (para ícone de tendência) */
  direction?: 'up' | 'down' | 'maintain';
  /** Classe adicional */
  className?: string;
  /** Se deve ser clicável (link para KPI) */
  clickable?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

/**
 * Badge visual para indicar que uma KR tem KPI primária vinculada.
 * 
 * Variantes:
 * - icon-only: Apenas ícone (para espaços muito compactos)
 * - compact: Ícone + "KPI" (padrão para listagens)
 * - full: Ícone + nome da KPI (para contextos com mais espaço)
 */
export function KrPrimaryKpiBadge({
  kpiName,
  kpiId,
  variant = 'compact',
  direction,
  className,
  clickable = false,
}: KrPrimaryKpiBadgeProps) {
  // Ícone de direção (ou ícone genérico de atividade)
  const DirectionIcon = direction === 'up' 
    ? TrendingUp 
    : direction === 'down' 
      ? TrendingDown 
      : direction === 'maintain'
        ? Minus
        : Activity;

  const tooltipText = kpiName 
    ? `Progresso medido pela KPI "${kpiName}"`
    : 'Progresso medido por KPI primária';

  // Conteúdo do badge
  const badgeContent = (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] font-medium shrink-0",
        "bg-info/5 text-info border-info/20",
        "hover:bg-info/10",
        clickable && "cursor-pointer",
        className
      )}
    >
      <DirectionIcon className={cn(
        "shrink-0",
        variant === 'icon-only' ? "w-3 h-3" : "w-3 h-3 mr-1"
      )} />
      {variant === 'compact' && "KPI"}
      {variant === 'full' && (kpiName ? kpiName : "KPI")}
    </Badge>
  );

  // Com tooltip
  const badgeWithTooltip = (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tooltipText}</p>
          <p className="text-muted-foreground mt-0.5">
            O valor é atualizado automaticamente
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Se clicável e tem ID, renderiza como link
  if (clickable && kpiId) {
    return (
      <Link 
        to={`/kpis?kpi=${kpiId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {badgeWithTooltip}
      </Link>
    );
  }

  return badgeWithTooltip;
}
