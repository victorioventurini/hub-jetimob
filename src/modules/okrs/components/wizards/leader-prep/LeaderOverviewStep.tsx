/**
 * LeaderOverviewStep - Etapa 1 do Wizard Líder Prep
 * 
 * Painel-resumo do time com métricas:
 * - % de KRs atualizados no prazo
 * - KRs em risco
 * - KRs sem atualização
 * - Iniciativas críticas
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { LastCheckinBadge } from '../shared/LastCheckinBadge';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { LeaderOverviewMetrics } from '@/modules/okrs/types/wizard';
import { METRIC_CARD_STYLES, getHealthScoreColor } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface LeaderOverviewStepProps {
  metrics: LeaderOverviewMetrics | null;
  teamName: string;
  cycleName?: string;
  isLoading?: boolean;
  lastCompletedAt?: string | null;
  onContinue: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function LeaderOverviewStep({
  metrics,
  teamName,
  cycleName,
  isLoading,
  lastCompletedAt,
  onContinue,
}: LeaderOverviewStepProps) {
  // Calculate percentages
  const stats = useMemo(() => {
    if (!metrics || metrics.totalKrs === 0) {
      return {
        onTimePercent: 0,
        latePercent: 0,
        noUpdatePercent: 0,
        atRiskPercent: 0,
        healthScore: 0,
      };
    }

    const total = metrics.totalKrs;
    const onTimePercent = Math.round((metrics.krsUpdatedOnTime / total) * 100);
    const latePercent = Math.round((metrics.krsUpdatedLate / total) * 100);
    const noUpdatePercent = Math.round((metrics.krsNoUpdate / total) * 100);
    const atRiskPercent = Math.round((metrics.krsAtRisk / total) * 100);

    // Health score: weighted average
    const healthScore = Math.round(
      (metrics.krsUpdatedOnTime * 100 +
        metrics.krsUpdatedLate * 50 +
        metrics.krsNoUpdate * 0) /
        total
    );

    return { onTimePercent, latePercent, noUpdatePercent, atRiskPercent, healthScore };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const hasNoData = !metrics || metrics.totalKrs === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold text-lg">Visão Geral: {teamName}</h3>
              {cycleName && (
                <p className="text-sm text-muted-foreground mt-1">{cycleName}</p>
              )}
              <LastCheckinBadge lastCompletedAt={lastCompletedAt ?? null} />
            </div>
            <WizardTooltipInline tooltipKey="leader-overview" />
            <AskToVicStepHelper
              context={{
                module: 'okrs',
                wizard: 'leader-prep',
                step: 'overview',
                userRole: 'lider',
                teamName,
                additionalData: metrics ? {
                  totalKrs: metrics.totalKrs,
                  krsAtRisk: metrics.krsAtRisk,
                  krsStagnant: metrics.krsStagnant,
                } : undefined,
              }}
            />
          </div>
          {metrics && (
            <div className="text-right">
              <p className="text-3xl font-bold">{metrics.totalKrs}</p>
              <p className="text-xs text-muted-foreground">KRs no ciclo</p>
            </div>
          )}
        </div>
      </div>

      {/* Health Score */}
      {!hasNoData && (
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Saúde das Atualizações</span>
            <span className={cn(
              "text-lg font-bold",
              getHealthScoreColor(stats.healthScore).text
            )}>
              {stats.healthScore}%
            </span>
          </div>
          <Progress 
            value={stats.healthScore} 
            className={cn("h-2", getHealthScoreColor(stats.healthScore).progress)}
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.onTimePercent}% no prazo</span>
            <span>{stats.latePercent}% atrasados</span>
            <span>{stats.noUpdatePercent}% sem update</span>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasNoData ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium">Nenhum KR encontrado</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Seu time não possui KRs neste ciclo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Updated on time */}
            <Card className={METRIC_CARD_STYLES.success.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", METRIC_CARD_STYLES.success.iconBg)}>
                    <CheckCircle2 className={cn("h-5 w-5", METRIC_CARD_STYLES.success.icon)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.krsUpdatedOnTime}</p>
                    <p className="text-xs text-muted-foreground">No prazo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Updated late */}
            <Card className={cn(
              metrics!.krsUpdatedLate > 0 ? METRIC_CARD_STYLES.warning.card : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsUpdatedLate > 0 ? METRIC_CARD_STYLES.warning.iconBg : METRIC_CARD_STYLES.neutral.iconBg
                  )}>
                    <Clock className={cn(
                      "h-5 w-5",
                      metrics!.krsUpdatedLate > 0 ? METRIC_CARD_STYLES.warning.icon : METRIC_CARD_STYLES.neutral.icon
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.krsUpdatedLate}</p>
                    <p className="text-xs text-muted-foreground">Atrasados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* No update */}
            <Card className={cn(
              metrics!.krsNoUpdate > 0 ? METRIC_CARD_STYLES.danger.card : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsNoUpdate > 0 ? METRIC_CARD_STYLES.danger.iconBg : METRIC_CARD_STYLES.neutral.iconBg
                  )}>
                    <XCircle className={cn(
                      "h-5 w-5",
                      metrics!.krsNoUpdate > 0 ? METRIC_CARD_STYLES.danger.icon : METRIC_CARD_STYLES.neutral.icon
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.krsNoUpdate}</p>
                    <p className="text-xs text-muted-foreground">Sem update</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* At risk */}
            <Card className={cn(
              metrics!.krsAtRisk > 0 ? METRIC_CARD_STYLES.warning.card : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsAtRisk > 0 ? METRIC_CARD_STYLES.warning.iconBg : METRIC_CARD_STYLES.neutral.iconBg
                  )}>
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      metrics!.krsAtRisk > 0 ? METRIC_CARD_STYLES.warning.icon : METRIC_CARD_STYLES.neutral.icon
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.krsAtRisk}</p>
                    <p className="text-xs text-muted-foreground">Em risco</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stagnant */}
            <Card className={cn(
              metrics!.krsStagnant > 0 ? METRIC_CARD_STYLES.purple.card : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsStagnant > 0 ? METRIC_CARD_STYLES.purple.iconBg : METRIC_CARD_STYLES.neutral.iconBg
                  )}>
                    <TrendingDown className={cn(
                      "h-5 w-5",
                      metrics!.krsStagnant > 0 ? METRIC_CARD_STYLES.purple.icon : METRIC_CARD_STYLES.neutral.icon
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.krsStagnant}</p>
                    <p className="text-xs text-muted-foreground">Estagnados (14d+)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical initiatives */}
            <Card className={cn(
              metrics!.initiativesCritical > 0 ? METRIC_CARD_STYLES.danger.card : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.initiativesCritical > 0 ? METRIC_CARD_STYLES.danger.iconBg : METRIC_CARD_STYLES.neutral.iconBg
                  )}>
                    <Zap className={cn(
                      "h-5 w-5",
                      metrics!.initiativesCritical > 0 ? METRIC_CARD_STYLES.danger.icon : METRIC_CARD_STYLES.neutral.icon
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics!.initiativesCritical}</p>
                    <p className="text-xs text-muted-foreground">Iniciativas bloq.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <Button onClick={onContinue} className="w-full" size="lg">
          Ver destaques
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
