/**
 * ManagersPanoramaStep - Etapa 1 do Wizard Check-in de Gestores
 * 
 * Panorama geral de todas as áreas:
 * - Resumo por área/time
 * - Tendências e alertas
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { AreaOkrSummary } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ManagersPanoramaStepProps {
  areas: AreaOkrSummary[];
  companyProgress: number;
  isLoading?: boolean;
  onContinue: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function getTrendIcon(trend: AreaOkrSummary['trend']) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function ManagersPanoramaStep({
  areas,
  companyProgress,
  isLoading,
  onContinue,
}: ManagersPanoramaStepProps) {
  const totalAtRisk = useMemo(() => 
    areas.reduce((sum, a) => sum + a.atRiskCount, 0),
    [areas]
  );

  const avgProgress = useMemo(() => {
    if (areas.length === 0) return 0;
    return Math.round(areas.reduce((sum, a) => sum + a.avgProgress, 0) / areas.length);
  }, [areas]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Panorama Geral</h3>
              <WizardTooltipInline tooltipKey="managers-panorama" />
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'managers-checkin',
                  step: 'panorama',
                  userRole: 'gestor',
                  additionalData: {
                    areasCount: areas.length,
                    totalAtRisk,
                    avgProgress,
                    companyProgress,
                  },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {areas.length} áreas em análise
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{companyProgress}%</p>
            <p className="text-xs text-muted-foreground">empresa</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Progresso médio</p>
            <p className="text-lg font-bold">{avgProgress}%</p>
          </div>
          {totalAtRisk > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalAtRisk} em risco
            </Badge>
          )}
        </div>
        <Progress value={avgProgress} className="h-2 mt-3" />
      </div>

      {/* Areas Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {areas.map((area) => (
            <Card 
              key={area.teamId}
              className={cn(
                "transition-colors",
                area.atRiskCount > 0 && "border-orange-200 dark:border-orange-800/50"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{area.areaName}</CardTitle>
                  {getTrendIcon(area.trend)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{area.okrCount} OKRs</span>
                    <span className="font-bold">{area.avgProgress}%</span>
                  </div>
                  <Progress 
                    value={area.avgProgress} 
                    className={cn(
                      "h-1.5",
                      area.avgProgress >= 70 && "[&>div]:bg-green-500",
                      area.avgProgress >= 40 && area.avgProgress < 70 && "[&>div]:bg-yellow-500",
                      area.avgProgress < 40 && "[&>div]:bg-red-500"
                    )}
                  />
                  {area.atRiskCount > 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      {area.atRiskCount} em risco
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {areas.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              Nenhuma área encontrada
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <Button onClick={onContinue} className="w-full" size="lg">
          Ver pontos de atenção
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
