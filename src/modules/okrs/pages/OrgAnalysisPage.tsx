/**
 * OrgAnalysisPage - Página de Análise de OKRs Organizacionais
 * 
 * Acesso: Apenas Admin e Super Admin
 * Funcionalidades:
 * - Avaliação com 4 critérios (0-10): Coesão, Distribuição, Cobertura, Rastreabilidade
 * - Resumo por time com link para página de qualidade
 * - Análise assistida pela IA Vic
 * - Identificação de gaps e recomendações
 */

import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, BarChart3, GitBranch, PieChart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOrgOkrAnalysis, type AnalysisScore } from "../hooks/useOrgOkrAnalysis";
import { useVic } from "@/modules/vic/contexts/VicContext";
import {
  AnalysisScoreCard,
  TeamSummaryList,
  VicAnalysisPanel,
  GapsRecommendationsCard,
  OrgOkrOverviewCard,
  type GapItem,
} from "../components/analysis";

export default function OrgAnalysisPage() {
  
  // Current year
  const year = new Date().getFullYear();
  
  usePageTitle('Análise de OKRs Organizacionais');

  // Fetch analysis data
  const analysisData = useOrgOkrAnalysis(year);
  const { openPanel } = useVic();

  const { scores, isLoading } = analysisData;

  // Handler for asking Vic about a specific score
  const handleAskVicAboutScore = useCallback((
    scoreType: 'cohesion' | 'distribution' | 'coverage' | 'traceability',
    score: AnalysisScore
  ) => {
    const scoreLabels = {
      cohesion: 'Coesão entre OKRs organizacionais e de times',
      distribution: 'Distribuição de responsabilidades entre times',
      coverage: 'Cobertura estratégica das OKRs',
      traceability: 'Transparência e rastreabilidade',
    };

    openPanel({
      agentSlug: 'alinhamento-estrategico',
      actionContext: 'okr-analysis-improvement',
      context: {
        type: 'analysis-score-improvement',
        title: `Como melhorar: ${score.label}`,
        description: `Score atual: ${score.value.toFixed(1)}/10 - ${score.description}`,
        additionalData: {
          scoreType,
          scoreName: scoreLabels[scoreType],
          currentValue: score.value,
          status: score.status,
          description: score.description,
          totals: analysisData.totals,
          gaps: {
            teamsWithoutOkrs: analysisData.gaps.teamsWithoutOkrs.map(t => t.name),
            orgKrsWithoutLinks: analysisData.gaps.orgKrsWithoutTeamLinks.length,
            teamsWithLowHealth: analysisData.gaps.teamsWithLowHealth.map(t => ({
              name: t.name,
              score: t.healthScore,
            })),
          },
        },
      },
    });
  }, [openPanel, analysisData]);

  // Handler for asking Vic about overview
  const handleAskVicAboutOverview = useCallback(() => {
    openPanel({
      agentSlug: 'alinhamento-estrategico',
      actionContext: 'okr-overview-insights',
      context: {
        type: 'okr-overview-analysis',
        title: 'Insights sobre estrutura de OKRs',
        description: `${analysisData.totals.orgObjectives} objetivos organizacionais, ${analysisData.totals.totalTeams} times`,
        additionalData: {
          totals: analysisData.totals,
          linkagePercent: analysisData.totals.orgKrs > 0 
            ? Math.round((analysisData.totals.linkedKrs / analysisData.totals.orgKrs) * 100) 
            : 0,
          teamsPercent: analysisData.totals.totalTeams > 0 
            ? Math.round((analysisData.totals.teamsWithOkrs / analysisData.totals.totalTeams) * 100) 
            : 0,
          overallScore: scores.overall.value,
        },
      },
    });
  }, [openPanel, analysisData, scores]);

  // Handler for asking Vic about a specific gap
  const handleAskVicAboutGap = useCallback((gapType: string, gapData: GapItem) => {
    openPanel({
      agentSlug: 'alinhamento-estrategico',
      actionContext: 'okr-gap-resolution',
      context: {
        type: 'gap-resolution',
        title: `Resolver: ${gapData.title}`,
        description: gapData.description,
        additionalData: {
          gapType,
          severity: gapData.severity,
          count: gapData.count,
          details: gapData.description,
          // Include specific data based on gap type
          ...(gapType === 'teams-without-okrs' && {
            teams: analysisData.gaps.teamsWithoutOkrs.map(t => ({ id: t.id, name: t.name })),
          }),
          ...(gapType === 'krs-without-links' && {
            krs: analysisData.gaps.orgKrsWithoutTeamLinks.map(kr => ({ id: kr.id, title: kr.title })),
          }),
          ...(gapType === 'teams-low-health' && {
            teams: analysisData.gaps.teamsWithLowHealth.map(t => ({ 
              id: t.id, 
              name: t.name, 
              healthScore: t.healthScore 
            })),
          }),
          ...(gapType === 'uncovered-areas' && {
            areas: analysisData.gaps.strategicAreasUncovered,
          }),
        },
      },
    });
  }, [openPanel, analysisData]);

  return (
    <>
      <Helmet>
        <title>Análise de OKRs Organizacionais | Hub Jetimob</title>
        <meta 
          name="description" 
          content="Avalie a coesão, distribuição, cobertura e rastreabilidade das OKRs da empresa" 
        />
      </Helmet>

      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/okrs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Análise de OKRs Organizacionais</h1>
              <p className="text-muted-foreground text-sm">
                Avalie a estrutura e qualidade das OKRs da empresa
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : (
          <>
            {/* Overall Score */}
            <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Score Geral</p>
                <p className={`text-4xl font-bold ${
                  scores.overall.status === 'excellent' ? 'text-green-600' :
                  scores.overall.status === 'good' ? 'text-blue-600' :
                  scores.overall.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {scores.overall.value.toFixed(1)}
                  <span className="text-lg text-muted-foreground">/10</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {scores.overall.description}
                </p>
              </div>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnalysisScoreCard 
                score={scores.cohesion}
                icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
                onAskVic={() => handleAskVicAboutScore('cohesion', scores.cohesion)}
              />
              <AnalysisScoreCard 
                score={scores.distribution}
                icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
                onAskVic={() => handleAskVicAboutScore('distribution', scores.distribution)}
              />
              <AnalysisScoreCard 
                score={scores.coverage}
                icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                onAskVic={() => handleAskVicAboutScore('coverage', scores.coverage)}
              />
              <AnalysisScoreCard 
                score={scores.traceability}
                icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                onAskVic={() => handleAskVicAboutScore('traceability', scores.traceability)}
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <OrgOkrOverviewCard 
                  totals={analysisData.totals}
                  overallProgress={
                    analysisData.orgObjectives.length > 0
                      ? Math.round(
                          analysisData.orgObjectives.reduce((sum, obj) => sum + obj.aggregatedProgress, 0) / 
                          analysisData.orgObjectives.length
                        )
                      : undefined
                  }
                  onAnalyze={handleAskVicAboutOverview}
                />
                <GapsRecommendationsCard 
                  gaps={analysisData.gaps}
                  onAskVicAboutGap={handleAskVicAboutGap}
                />
              </div>

              {/* Right Column */}
              <div>
                <VicAnalysisPanel analysisData={analysisData} />
              </div>
            </div>

            {/* Teams Summary */}
            <TeamSummaryList 
              teams={analysisData.teamSummaries}
              cycleId={null}
            />
          </>
        )}
      </div>
    </>
  );
}
