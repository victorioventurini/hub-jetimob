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

// ============================================================
// TYPES
// ============================================================

export interface LeaderOverviewStepProps {
  metrics: LeaderOverviewMetrics | null;
  teamName: string;
  cycleName?: string;
  isLoading?: boolean;
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
              stats.healthScore >= 70 && "text-green-600",
              stats.healthScore >= 40 && stats.healthScore < 70 && "text-yellow-600",
              stats.healthScore < 40 && "text-red-600"
            )}>
              {stats.healthScore}%
            </span>
          </div>
          <Progress 
            value={stats.healthScore} 
            className={cn(
              "h-2",
              stats.healthScore >= 70 && "[&>div]:bg-green-500",
              stats.healthScore >= 40 && stats.healthScore < 70 && "[&>div]:bg-yellow-500",
              stats.healthScore < 40 && "[&>div]:bg-red-500"
            )}
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
            <Card className="border-green-200 dark:border-green-800/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
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
              metrics!.krsUpdatedLate > 0 
                ? "border-orange-200 dark:border-orange-800/50" 
                : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsUpdatedLate > 0 
                      ? "bg-orange-100 dark:bg-orange-900/30" 
                      : "bg-muted"
                  )}>
                    <Clock className={cn(
                      "h-5 w-5",
                      metrics!.krsUpdatedLate > 0 
                        ? "text-orange-600 dark:text-orange-400" 
                        : "text-muted-foreground"
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
              metrics!.krsNoUpdate > 0 
                ? "border-red-200 dark:border-red-800/50" 
                : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsNoUpdate > 0 
                      ? "bg-red-100 dark:bg-red-900/30" 
                      : "bg-muted"
                  )}>
                    <XCircle className={cn(
                      "h-5 w-5",
                      metrics!.krsNoUpdate > 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-muted-foreground"
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
              metrics!.krsAtRisk > 0 
                ? "border-yellow-200 dark:border-yellow-800/50" 
                : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsAtRisk > 0 
                      ? "bg-yellow-100 dark:bg-yellow-900/30" 
                      : "bg-muted"
                  )}>
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      metrics!.krsAtRisk > 0 
                        ? "text-yellow-600 dark:text-yellow-400" 
                        : "text-muted-foreground"
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
              metrics!.krsStagnant > 0 
                ? "border-purple-200 dark:border-purple-800/50" 
                : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.krsStagnant > 0 
                      ? "bg-purple-100 dark:bg-purple-900/30" 
                      : "bg-muted"
                  )}>
                    <TrendingDown className={cn(
                      "h-5 w-5",
                      metrics!.krsStagnant > 0 
                        ? "text-purple-600 dark:text-purple-400" 
                        : "text-muted-foreground"
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
              metrics!.initiativesCritical > 0 
                ? "border-red-200 dark:border-red-800/50" 
                : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    metrics!.initiativesCritical > 0 
                      ? "bg-red-100 dark:bg-red-900/30" 
                      : "bg-muted"
                  )}>
                    <Zap className={cn(
                      "h-5 w-5",
                      metrics!.initiativesCritical > 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-muted-foreground"
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
