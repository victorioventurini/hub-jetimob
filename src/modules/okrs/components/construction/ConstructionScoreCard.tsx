/**
 * ConstructionScoreCard - Card com score de qualidade de construção
 */

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ConstructionScoreCardProps {
  checklistScore: number;
  aiScore?: number;
  combinedScore: number;
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
  totalObjectives: number;
  isLoading?: boolean;
}

export function ConstructionScoreCard({
  checklistScore,
  aiScore,
  combinedScore,
  approvedCount,
  needsImprovementCount,
  pendingCount,
  totalObjectives,
  isLoading,
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Qualidade da Construção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center py-4">
          <div className={cn("text-5xl font-bold", getScoreColor(combinedScore))}>
            {combinedScore}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Score Combinado</p>
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
              className={cn("h-full transition-all duration-500", getProgressColor(combinedScore))}
              style={{ width: `${combinedScore}%` }}
            />
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-2xl font-semibold">{checklistScore}</div>
            <p className="text-xs text-muted-foreground">Checklist</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold">
              {aiScore !== undefined ? aiScore : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Avaliação IA</p>
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
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{pendingCount}</span>
            <span className="text-xs text-muted-foreground">Pendente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
