/**
 * OrgHealthScoreCard - Card de score geral de saúde das OKRs organizacionais
 */

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  TrendingUp,
  GitBranch,
  PieChart,
  BarChart3,
  Eye,
} from "lucide-react";
import { 
  type ConsolidatedOrgAnalysis,
  getHealthStatusColor,
  getHealthStatusLabel,
  getHealthStatusEmoji,
} from "../../types/org-health-review";

interface OrgHealthScoreCardProps {
  overallScore: number;
  scores: {
    cohesion: number;
    distribution: number;
    coverage: number;
    traceability: number;
  };
  counts: {
    totalObjectives: number;
    healthyCount: number;
    attentionCount: number;
    riskCount: number;
  };
  consolidatedAnalysis?: ConsolidatedOrgAnalysis;
  consolidatedLoading: boolean;
  consolidatedError?: string;
  onRefreshAnalysis: () => void;
  isLoading?: boolean;
}

export function OrgHealthScoreCard({
  overallScore,
  scores,
  counts,
  consolidatedAnalysis,
  consolidatedLoading,
  consolidatedError,
  onRefreshAnalysis,
  isLoading,
}: OrgHealthScoreCardProps) {
  
  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-success';
    if (score >= 4) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 7) return 'bg-success';
    if (score >= 4) return 'bg-warning';
    return 'bg-destructive';
  };

  const overallStatus = overallScore >= 7 ? 'healthy' : overallScore >= 4 ? 'attention' : 'risk';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Saúde de Execução
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Main Score */}
        <div className="text-center py-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{getHealthStatusEmoji(overallStatus)}</span>
            <span className={cn("text-4xl font-bold", getScoreColor(overallScore))}>
              {overallScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">/10</span>
          </div>
          <Badge className={cn("text-xs", getHealthStatusColor(overallStatus))}>
            {getHealthStatusLabel(overallStatus)}
          </Badge>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Métricas de Saúde
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ScoreMetric 
              icon={<GitBranch className="w-3.5 h-3.5" />}
              label="Coesão" 
              score={scores.cohesion} 
              getColor={getScoreColor}
              getProgressColor={getProgressColor}
            />
            <ScoreMetric 
              icon={<PieChart className="w-3.5 h-3.5" />}
              label="Distribuição" 
              score={scores.distribution} 
              getColor={getScoreColor}
              getProgressColor={getProgressColor}
            />
            <ScoreMetric 
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Cobertura" 
              score={scores.coverage} 
              getColor={getScoreColor}
              getProgressColor={getProgressColor}
            />
            <ScoreMetric 
              icon={<Eye className="w-3.5 h-3.5" />}
              label="Rastreabilidade" 
              score={scores.traceability} 
              getColor={getScoreColor}
              getProgressColor={getProgressColor}
            />
          </div>
        </div>

        {/* Status Counters */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Status dos Objetivos
          </h4>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-center p-2 bg-success-muted rounded-lg border border-success/30">
              <div className="text-lg font-bold text-success">{counts.healthyCount}</div>
              <p className="text-[10px] text-success">Saudáveis</p>
            </div>
            <div className="flex-1 text-center p-2 bg-warning-muted rounded-lg border border-warning/30">
              <div className="text-lg font-bold text-warning">{counts.attentionCount}</div>
              <p className="text-[10px] text-warning">Atenção</p>
            </div>
            <div className="flex-1 text-center p-2 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="text-lg font-bold text-destructive">{counts.riskCount}</div>
              <p className="text-[10px] text-destructive">Em Risco</p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Análise Consolidada
            </h4>
            {consolidatedAnalysis && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRefreshAnalysis}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Atualizar
              </Button>
            )}
          </div>

          {consolidatedLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Analisando saúde...</span>
            </div>
          )}

          {consolidatedError && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              {consolidatedError}
            </div>
          )}

          {consolidatedAnalysis && !consolidatedLoading && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {consolidatedAnalysis.summary}
              </p>

              {/* Top Risks */}
              {consolidatedAnalysis.topRisks?.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-medium text-danger flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Principais Riscos
                  </h5>
                  <ul className="space-y-1">
                    {consolidatedAnalysis.topRisks.slice(0, 3).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{item.objectiveTitle}:</span>{" "}
                        {item.risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {consolidatedAnalysis.recommendations?.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Recomendações
                  </h5>
                  <ul className="space-y-1">
                    {consolidatedAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="text-xs text-muted-foreground pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-primary">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SCORE METRIC COMPONENT
// ============================================================

function ScoreMetric({ 
  icon,
  label, 
  score, 
  getColor, 
  getProgressColor 
}: { 
  icon: React.ReactNode;
  label: string; 
  score: number;
  getColor: (s: number) => string;
  getProgressColor: (s: number) => string;
}) {
  return (
    <div className="p-2 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          {icon}
          <span className="text-[10px]">{label}</span>
        </div>
        <span className={cn("text-sm font-semibold", getColor(score))}>
          {score.toFixed(1)}
        </span>
      </div>
      <Progress 
        value={score * 10} 
        className={cn("h-1", getProgressColor(score))}
      />
    </div>
  );
}
