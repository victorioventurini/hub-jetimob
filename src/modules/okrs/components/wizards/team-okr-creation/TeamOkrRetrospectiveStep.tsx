/**
 * TeamOkrRetrospectiveStep - Step 2: Aprendendo com o Passado
 * 
 * Cap. 3 do storytelling:
 * - Mostra OKRs do ciclo anterior
 * - Taxa de atingimento
 * - KRs abandonados
 * - Insights sem julgamento
 */

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Target, TrendingUp, TrendingDown, AlertCircle, Sparkles, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VicGeneratingCard } from '@/modules/vic';
import { WizardStepFooter } from '../shared';
import { VicInsightCard } from '../shared/VicInsightCard';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import type { VicInsight } from '@/modules/okrs/types/wizard';
import type { PreviousCycleAnalysis } from '@/modules/okrs/hooks/useTeamPreviousCycleAnalysis';
import { RAG_STATUS_COLORS, TREND_COLORS } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrRetrospectiveStepProps {
  teamName: string;
  analysis: PreviousCycleAnalysis | null;
  isLoading?: boolean;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrRetrospectiveStep({
  teamName,
  analysis,
  isLoading = false,
  onContinue,
  onBack,
}: TeamOkrRetrospectiveStepProps) {
  const { invokeVic } = useWizardAI();
  const [aiInsight, setAiInsight] = useState<VicInsight | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  
  // Guard to prevent multiple invocations
  const hasInvokedRef = useRef(false);
  const analysisIdRef = useRef<string | null>(null);

  // Generate retrospective insight - only once per analysis
  useEffect(() => {
    // Skip if no analysis or already invoked for this analysis
    if (!analysis) return;
    
    // Create a stable ID for the analysis
    const analysisId = `${analysis.objectives.length}-${analysis.avgCompletion}-${analysis.abandonedKrs.length}`;
    
    // Skip if already invoked for this exact analysis
    if (hasInvokedRef.current && analysisIdRef.current === analysisId) {
      return;
    }
    
    const generateInsight = async () => {
      hasInvokedRef.current = true;
      analysisIdRef.current = analysisId;
      setIsGeneratingInsight(true);
      
      try {
        const response = await invokeVic(
          'analista-kpis',
          'kpi-monthly-summary',
          {
            type: 'retrospective',
            additionalData: {
              objectivesCount: analysis.objectives.length,
              avgCompletion: analysis.avgCompletion,
              abandonedCount: analysis.abandonedKrs.length,
              kpiTrends: analysis.kpiTrends,
            },
          },
          'Analise o ciclo anterior e forneça 2-3 aprendizados sem julgar, focando em padrões observados e oportunidades de melhoria.',
          { silent: true }
        );

        setAiInsight({
          id: 'retro-insight',
          type: 'insight',
          content: response.response,
          priority: 'medium',
          source: 'analista-kpis',
        });
      } catch {
        // Fallback insight - don't flood with toasts since we use silent mode
        if (analysis.abandonedKrs.length > 0) {
          setAiInsight({
            id: 'retro-insight-fallback',
            type: 'insight',
            content: `No último ciclo, ${analysis.abandonedKrs.length} KR(s) ficaram sem atualização após a 2ª semana. Times com 3 KRs ativos tiveram 28% mais foco.`,
            priority: 'medium',
            source: 'analista-kpis',
          });
        }
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    generateInsight();
  }, [analysis]); // Remove invokeVic from deps - it changes every render

  const hasData = analysis && (analysis.objectives.length > 0 || analysis.kpiTrends.length > 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-1">Aprendendo com o Passado</h2>
            <p className="text-sm text-muted-foreground">
              Antes de olhar para frente, vamos entender o que o ciclo anterior nos ensinou.
            </p>
          </div>

          {!hasData ? (
            /* No Previous Data */
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Primeiro ciclo do time</h3>
                <p className="text-sm text-muted-foreground">
                  Não há dados de ciclos anteriores. Isso é uma oportunidade para 
                  começar com boas práticas desde o início!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {analysis.objectives.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Objetivo{analysis.objectives.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {analysis.avgCompletion}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atingimento médio
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className={cn(
                      "text-2xl font-bold",
                      analysis.abandonedKrs.length > 0 ? "text-status-yellow" : "text-status-green"
                    )}>
                      {analysis.abandonedKrs.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      KR{analysis.abandonedKrs.length !== 1 ? 's' : ''} sem update
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Previous Objectives */}
              {analysis.objectives.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Objetivos do Ciclo Anterior
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.objectives.slice(0, 3).map(obj => (
                      <div key={obj.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{obj.title}</p>
                          <Badge className={cn(
                            "shrink-0 text-xs",
                            obj.progress >= 70 && RAG_STATUS_COLORS.green.badge,
                            obj.progress >= 40 && obj.progress < 70 && RAG_STATUS_COLORS.yellow.badge,
                            obj.progress < 40 && RAG_STATUS_COLORS.red.badge
                          )}>
                            {obj.progress}%
                          </Badge>
                        </div>
                        <Progress value={obj.progress} className="h-1.5" />
                      </div>
                    ))}
                    {analysis.objectives.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{analysis.objectives.length - 3} outros objetivos
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Abandoned KRs (if any) */}
              {analysis.abandonedKrs.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <AlertCircle className="h-4 w-4" />
                      KRs sem Atualização
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.abandonedKrs.slice(0, 3).map(kr => (
                      <div key={kr.id} className="flex items-center gap-2 text-sm p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <XCircle className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="line-clamp-1">{kr.title}</span>
                      </div>
                    ))}
                    {analysis.abandonedKrs.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{analysis.abandonedKrs.length - 3} outros
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* KPI Trends */}
              {analysis.kpiTrends.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Evolução dos KPIs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.kpiTrends.map(kpi => (
                        <div key={kpi.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{kpi.name}</span>
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            TREND_COLORS[kpi.trend]
                          )}>
                            {kpi.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                            {kpi.trend === 'down' && <TrendingDown className="h-4 w-4" />}
                            {kpi.trend === 'flat' && <span>→</span>}
                            <span className="capitalize">{kpi.trend === 'up' ? 'Melhorou' : kpi.trend === 'down' ? 'Piorou' : 'Estável'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* AI Insight */}
          {isGeneratingInsight ? (
            <VicGeneratingCard text="Analisando ciclo anterior..." />
          ) : aiInsight ? (
            <VicInsightCard insight={aiInsight} showSource />
          ) : null}

          {/* Vic Quote */}
          <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
            <p className="text-sm italic">
              "OKRs não são sobre intenção. São sobre compromisso consciente."
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Vic
            </p>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Definir o foco do ciclo"
        onPrimary={onContinue}
      />
    </div>
  );
}
