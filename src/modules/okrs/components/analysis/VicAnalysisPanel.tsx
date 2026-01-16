/**
 * VicAnalysisPanel - Painel de análise com IA Vic
 * Permite gerar análises e recomendações baseadas nos dados das OKRs
 */

import { useState } from "react";
import { Sparkles, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVicAgent, useVicEnabled } from "@/modules/vic/hooks";
import { cn } from "@/lib/utils";
import type { OrgOkrAnalysisData } from "../../hooks";

interface VicAnalysisPanelProps {
  analysisData: OrgOkrAnalysisData;
  className?: string;
}

export function VicAnalysisPanel({ 
  analysisData,
  className 
}: VicAnalysisPanelProps) {
  const { isEnabled, isLoading: isCheckingEnabled } = useVicEnabled();
  const { invoke, isLoading: isPending, response: lastResponse } = useVicAgent();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    
    try {
      await invoke(
        'alinhamento-estrategico',
        'okr-check-alignment',
        {
          type: 'okr-org-analysis',
          title: 'Análise de OKRs Organizacionais',
          description: `Avaliação completa das OKRs da empresa com ${analysisData.totals.orgObjectives} objetivos organizacionais e ${analysisData.totals.totalTeams} times.`,
          additionalData: {
            scores: {
              cohesion: analysisData.scores.cohesion.value,
              distribution: analysisData.scores.distribution.value,
              coverage: analysisData.scores.coverage.value,
              traceability: analysisData.scores.traceability.value,
              overall: analysisData.scores.overall.value,
            },
            totals: analysisData.totals,
            gaps: {
              teamsWithoutOkrs: analysisData.gaps.teamsWithoutOkrs.map(t => t.name),
              orgKrsWithoutLinks: analysisData.gaps.orgKrsWithoutTeamLinks.length,
              teamsWithLowHealth: analysisData.gaps.teamsWithLowHealth.map(t => ({
                name: t.name,
                score: t.healthScore,
              })),
              uncoveredAreas: analysisData.gaps.strategicAreasUncovered,
            },
            orgObjectives: analysisData.orgObjectives.map(obj => ({
              title: obj.title,
              krsCount: obj.orgKrs.length,
              linkedTeamKrs: obj.orgKrs.reduce((sum, kr) => sum + kr.linkedTeamKrs.length, 0),
            })),
          },
        },
        `Analise a estrutura das OKRs organizacionais considerando os 4 critérios:
1. Coesão entre OKRs org e times (score: ${analysisData.scores.cohesion.value}/10)
2. Distribuição de responsabilidades (score: ${analysisData.scores.distribution.value}/10)
3. Cobertura estratégica (score: ${analysisData.scores.coverage.value}/10)
4. Transparência e rastreabilidade (score: ${analysisData.scores.traceability.value}/10)

Identifique gaps e sugira melhorias específicas.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar');
    }
  };

  const handleCopy = async () => {
    if (lastResponse?.response) {
      await navigator.clipboard.writeText(lastResponse.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isCheckingEnabled) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isEnabled) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A análise com IA está desabilitada para esta unidade de negócio.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Análise do Vic
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastResponse?.response && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            )}
            <Button
              onClick={handleAnalyze}
              disabled={isPending || analysisData.isLoading}
              size="sm"
              className="h-7"
            >
              {isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              {lastResponse ? 'Reanalisar' : 'Analisar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : lastResponse?.response ? (
          <ScrollArea className="h-[300px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {lastResponse.response}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Clique em "Analisar" para gerar insights e recomendações
            </p>
            <p className="text-xs mt-1">
              O Vic irá avaliar a estrutura das OKRs e sugerir melhorias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
