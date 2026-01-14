/**
 * ConstructionScoreCard - Card com score de qualidade de construção (IA automática)
 */

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, Users, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamAnalysisResult } from "../../types/construction-review";

interface ConstructionScoreCardProps {
  avgScore: number;
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
  totalObjectives: number;
  globalAlignmentSuggestion?: string;
  isLoading?: boolean;
  // Análise consolidada
  teamAnalysis?: TeamAnalysisResult;
  teamAnalysisLoading?: boolean;
}

export function ConstructionScoreCard({
  avgScore,
  approvedCount,
  needsImprovementCount,
  pendingCount,
  totalObjectives,
  globalAlignmentSuggestion,
  isLoading,
  teamAnalysis,
  teamAnalysisLoading,
}: ConstructionScoreCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const analyzingCount = pendingCount;
  const hasAnalyzing = analyzingCount > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Avaliação por IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center py-4">
          <div className={cn("text-5xl font-bold", getScoreColor(avgScore))}>
            {avgScore || '—'}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Score Médio</p>
          {hasAnalyzing && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analisando OKR com IA...
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", getProgressColor(avgScore))}
              style={{ width: `${avgScore}%` }}
            />
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">{approvedCount}</span>
            <span className="text-xs text-muted-foreground">OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium">{needsImprovementCount}</span>
            <span className="text-xs text-muted-foreground">Melhorar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Loader2 className={cn("w-4 h-4 text-muted-foreground", hasAnalyzing && "animate-spin text-blue-600")} />
            <span className="text-sm font-medium">{analyzingCount}</span>
            <span className="text-xs text-muted-foreground">Pendente</span>
          </div>
        </div>

        {teamAnalysisLoading && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analisando OKR com IA...
            </div>
          </div>
        )}

        {/* Org Alignment Analysis */}
        {teamAnalysis?.orgAlignmentAnalysis && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Alinhamento Organizacional ({teamAnalysis.orgAlignmentAnalysis.score}%)
            </h4>
            <p className="text-xs text-foreground bg-muted/50 p-2.5 rounded-lg">
              {teamAnalysis.orgAlignmentAnalysis.feedback}
            </p>
            {teamAnalysis.orgAlignmentAnalysis.uncoveredOrgObjectives?.length > 0 && (
              <p className="text-[10px] text-amber-600 mt-1.5">
                ⚠️ OKRs Org. não cobertos: {teamAnalysis.orgAlignmentAnalysis.uncoveredOrgObjectives.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Shared Objectives Suggestions */}
        {teamAnalysis?.sharedSuggestions && teamAnalysis.sharedSuggestions.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Sugestões de Colaboração
            </h4>
            <div className="space-y-2">
              {teamAnalysis.sharedSuggestions.slice(0, 3).map((suggestion, i) => (
                <div key={i} className="bg-primary/5 p-2.5 rounded-lg">
                  <p className="text-xs text-foreground">
                    Troque uma ideia com <strong>{suggestion.suggestedLeaderFirstName}</strong> do 
                    time <strong>{suggestion.suggestedTeamName}</strong>. O objetivo 
                    "<span className="italic">{suggestion.suggestedObjectiveTitle}</span>" parece ter 
                    sinergia com o seu "<span className="italic">{suggestion.objectiveTitle}</span>".
                  </p>
                  {suggestion.reason && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      💡 {suggestion.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global alignment suggestion (fallback) */}
        {globalAlignmentSuggestion && !teamAnalysis?.orgAlignmentAnalysis && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">💡 Sugestão de Alinhamento</h4>
            <p className="text-xs text-foreground bg-muted/50 p-2.5 rounded-lg">
              {globalAlignmentSuggestion}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
