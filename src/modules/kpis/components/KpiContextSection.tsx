/**
 * KpiContextSection - Componente para exibir KPIs agrupados por contexto no wizard
 * 
 * v2.83.0: Separação visual de KPIs por papel do usuário
 * - update: KPIs que o usuário precisa atualizar (é contribuidor)
 * - context: KPIs do time/área (somente leitura)
 * - strategic: KPIs organizacionais (badge especial)
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Building2,
  Users,
  BarChart3,
  Edit3,
  Eye,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

export type KpiContextVariant = 'update' | 'context' | 'strategic';

export interface KpiContextSectionProps {
  title: string;
  subtitle?: string;
  kpis: KpiForWizardV2[];
  variant: KpiContextVariant;
  showUpdateBadge?: boolean;
  showOwnerInfo?: boolean;
  emptyMessage?: string;
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

const VARIANT_CONFIG: Record<KpiContextVariant, {
  icon: typeof BarChart3;
  headerClass: string;
  cardClass: string;
  badgeText?: string;
}> = {
  update: {
    icon: Edit3,
    headerClass: 'bg-gradient-to-r from-primary/10 to-transparent border-primary/20',
    cardClass: 'border-primary/30 hover:border-primary/50',
    badgeText: undefined,
  },
  context: {
    icon: Users,
    headerClass: 'bg-gradient-to-r from-muted/50 to-transparent',
    cardClass: 'border-muted-foreground/20',
    badgeText: undefined,
  },
  strategic: {
    icon: Building2,
    headerClass: 'bg-gradient-to-r from-status-purple/10 to-transparent border-status-purple/20',
    cardClass: 'border-status-purple/30',
    badgeText: 'Estratégico',
  },
};

const RAG_CONFIG = {
  on_track: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge },
  at_risk: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge },
  off_track: { label: 'Fora da meta', className: RAG_STATUS_COLORS.red.badge },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground' },
};

function getTrendIcon(kpi: KpiForWizardV2) {
  // Infer trend from latest_value vs target_value
  if (kpi.latest_value === null || kpi.target_value === null) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  const percentOfTarget = (kpi.latest_value / kpi.target_value) * 100;
  if (percentOfTarget >= 100) {
    return <TrendingUp className="h-3 w-3 text-success" />;
  }
  if (percentOfTarget < 70) {
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  }
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

// ============================================================
// COMPONENT
// ============================================================

export function KpiContextSection({
  title,
  subtitle,
  kpis,
  variant,
  showUpdateBadge = false,
  showOwnerInfo = false,
  emptyMessage = 'Nenhum indicador nesta categoria',
  className,
}: KpiContextSectionProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  if (kpis.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section Header */}
      <div className={cn('flex items-center gap-2 p-2 rounded-lg', config.headerClass)}>
        <Icon className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">{title}</h4>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {kpis.length} {kpis.length === 1 ? 'indicador' : 'indicadores'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="space-y-2">
        {kpis.map((kpi) => {
          const ragConfig = RAG_CONFIG[kpi.latest_rag_status];
          const isEditable = kpi.displayMode === 'editable';
          const isAlert = kpi.displayMode === 'alert';

          return (
            <Card
              key={kpi.id}
              className={cn(
                'transition-colors',
                config.cardClass,
                isAlert && 'border-destructive/30 bg-destructive/5',
                !isEditable && variant === 'update' && 'opacity-75'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{kpi.name}</p>
                      {variant === 'strategic' && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-status-purple/30 text-status-purple">
                          <Star className="h-2.5 w-2.5" />
                          Estratégico
                        </Badge>
                      )}
                      {variant !== 'update' && (
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className={cn('text-xs', ragConfig.className)}>
                        {ragConfig.label}
                      </Badge>
                      
                      {kpi.needs_update && showUpdateBadge && (
                        <span className="flex items-center gap-1 text-xs text-status-orange">
                          <Clock className="h-3 w-3" />
                          Precisa atualização
                        </span>
                      )}
                      
                      {kpi.isGuardrailAtRisk && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Guardrail
                        </Badge>
                      )}
                    </div>

                    {/* Owner info for context/strategic */}
                    {showOwnerInfo && kpi.owner?.display_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Responsável: {kpi.owner.display_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {kpi.latest_value !== null ? (
                      <>
                        <div className="flex items-center gap-1 justify-end">
                          <p className="text-lg font-bold">
                            {kpi.latest_value} {kpi.unit}
                          </p>
                          {getTrendIcon(kpi)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Meta: {kpi.target_value} {kpi.unit}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </div>

                {/* Progress bar for update variant */}
                {variant === 'update' && kpi.target_value && kpi.latest_value !== null && (
                  <div className="mt-2">
                    <Progress
                      value={Math.min((kpi.latest_value / kpi.target_value) * 100, 100)}
                      className={cn(
                        'h-1.5',
                        kpi.latest_rag_status === 'off_track' && '[&>div]:bg-status-red',
                        kpi.latest_rag_status === 'at_risk' && '[&>div]:bg-status-yellow'
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}