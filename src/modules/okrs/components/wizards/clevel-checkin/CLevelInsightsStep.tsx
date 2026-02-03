/**
 * CLevelInsightsStep - Sinais Estratégicos
 * 
 * v2.83.0: Evolução para exibir KPIs como sinais de contexto e tendência,
 * não como itens operacionais de acompanhamento.
 * 
 * KPIs neste nível servem para:
 * - Validar direção estratégica
 * - Identificar riscos sistêmicos
 * - Sustentar decisões de alto nível
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import { RAG_STATUS_CONFIG } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

export interface CLevelInsightsStepProps {
  kpisStrategic: KpiForWizardV2[];
  okrsSummary?: {
    total: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
  };
  isLoading?: boolean;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

interface StrategicSignalCardProps {
  kpi: KpiForWizardV2;
  trend: 'improving' | 'stable' | 'declining';
}

function StrategicSignalCard({ kpi, trend }: StrategicSignalCardProps) {
  const ragConfig = RAG_STATUS_CONFIG[kpi.latest_rag_status];
  
  const TrendIcon = trend === 'improving' ? TrendingUp : 
                    trend === 'declining' ? TrendingDown : Activity;
  
  const trendLabel = trend === 'improving' ? 'Em melhoria' :
                     trend === 'declining' ? 'Em queda' : 'Estável';
  
  const trendColor = trend === 'improving' ? 'text-success' :
                     trend === 'declining' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-medium truncate">{kpi.name}</p>
            {kpi.area && (
              <Badge variant="outline" className="mt-1 text-xs" style={{
                backgroundColor: kpi.area.color ? `${kpi.area.color}20` : undefined,
                borderColor: kpi.area.color || undefined,
              }}>
                {kpi.area.name}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs ml-2", ragConfig.bgColor, ragConfig.color)}>
            {ragConfig.label}
          </Badge>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">
              {kpi.latest_value !== null ? kpi.latest_value : '-'}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {kpi.unit}
              </span>
            </p>
            {kpi.target_value !== null && (
              <p className="text-sm text-muted-foreground">
                Meta: {kpi.target_value} {kpi.unit}
              </p>
            )}
          </div>
          <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span>{trendLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CLevelInsightsStep({
  kpisStrategic,
  okrsSummary,
  isLoading,
  onContinue,
  onBack,
}: CLevelInsightsStepProps) {
  // Separate KPIs by status
  const { positiveSignals, attentionSignals, neutralSignals } = useMemo(() => {
    const positive: KpiForWizardV2[] = [];
    const attention: KpiForWizardV2[] = [];
    const neutral: KpiForWizardV2[] = [];

    for (const kpi of kpisStrategic) {
      if (kpi.latest_rag_status === 'on_track') {
        positive.push(kpi);
      } else if (kpi.latest_rag_status === 'off_track' || kpi.latest_rag_status === 'at_risk') {
        attention.push(kpi);
      } else {
        neutral.push(kpi);
      }
    }

    return { positiveSignals: positive, attentionSignals: attention, neutralSignals: neutral };
  }, [kpisStrategic]);

  // Determine trend (simplified - in real impl would compare with previous period)
  const getTrend = (kpi: KpiForWizardV2): 'improving' | 'stable' | 'declining' => {
    if (kpi.latest_rag_status === 'on_track') return 'improving';
    if (kpi.latest_rag_status === 'off_track') return 'declining';
    return 'stable';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasNoData = kpisStrategic.length === 0 && !okrsSummary;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-warning/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Sinais Estratégicos</h3>
              <WizardTooltipInline tooltipKey="clevel-insights" />
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'clevel-checkin',
                  step: 'insights',
                  userRole: 'clevel',
                  additionalData: {
                    totalKpis: kpisStrategic.length,
                    kpisAtRisk: attentionSignals.length,
                  },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Indicadores organizacionais e contexto para decisões
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {hasNoData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-lg">Sem indicadores estratégicos</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Não há KPIs organizacionais configurados. Configure indicadores de escopo "Organização" para visualizá-los aqui.
              </p>
            </div>
          ) : (
            <>
              {/* OKRs Summary Card */}
              {okrsSummary && (
                <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="font-medium">Validação de Direção</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{okrsSummary.total}</p>
                        <p className="text-xs text-muted-foreground">OKRs Org.</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{okrsSummary.onTrack}</p>
                        <p className="text-xs text-muted-foreground">No caminho</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">{okrsSummary.atRisk}</p>
                        <p className="text-xs text-muted-foreground">Em risco</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{okrsSummary.offTrack}</p>
                        <p className="text-xs text-muted-foreground">Fora da meta</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attention Signals */}
              {attentionSignals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Pontos de Atenção ({attentionSignals.length})
                  </div>
                  <div className="grid gap-3">
                    {attentionSignals.map(kpi => (
                      <StrategicSignalCard key={kpi.id} kpi={kpi} trend={getTrend(kpi)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Signals */}
              {positiveSignals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <TrendingUp className="h-4 w-4" />
                    Tendências Positivas ({positiveSignals.length})
                  </div>
                  <div className="grid gap-3">
                    {positiveSignals.map(kpi => (
                      <StrategicSignalCard key={kpi.id} kpi={kpi} trend={getTrend(kpi)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Neutral/No Data */}
              {neutralSignals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Aguardando Dados ({neutralSignals.length})
                  </div>
                  <div className="grid gap-3">
                    {neutralSignals.map(kpi => (
                      <StrategicSignalCard key={kpi.id} kpi={kpi} trend="stable" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button 
            onClick={onContinue}
            className="flex-1"
            size="lg"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
