/**
 * OrgObjectiveHealthCard - Card de saúde de um objetivo organizacional específico
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
} from "lucide-react";
import { 
  type OrgObjectiveHealthReview,
  type OrgKrHealthData,
  getHealthStatusColor,
  getHealthStatusLabel,
  getHealthStatusEmoji,
} from "../../types/org-health-review";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrgObjectiveHealthCardProps {
  review: OrgObjectiveHealthReview;
  onReEvaluate: (objectiveId: string) => void;
}

export function OrgObjectiveHealthCard({
  review,
  onReEvaluate,
}: OrgObjectiveHealthCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isLoading = review.aiAnalysisLoading;
  const hasError = !!review.aiAnalysisError;
  const analysis = review.aiAnalysis;

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'text-green-600';
    if (progress >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-medium text-sm line-clamp-2">
                      {review.objectiveTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span>{review.krCount} KR{review.krCount !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {review.linkedTeamsCount} time{review.linkedTeamsCount !== 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span className={cn("font-medium", getProgressColor(review.progress))}>
                      {review.progress}% progresso
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Loading */}
                {isLoading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Analisando...</span>
                  </div>
                ) : hasError ? (
                  <div className="flex items-center gap-1 text-destructive text-xs">
                    <AlertCircle className="w-4 h-4" />
                    Erro
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{getHealthStatusEmoji(review.healthStatus)}</span>
                      <span className={cn(
                        "text-lg font-bold",
                        review.healthStatus === 'healthy' ? 'text-green-600' :
                        review.healthStatus === 'attention' ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {review.healthScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Saúde</p>
                  </div>
                )}

                {/* Status badge */}
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getHealthStatusColor(review.healthStatus))}
                >
                  {getHealthStatusLabel(review.healthStatus)}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Error state */}
            {hasError && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span className="text-sm text-destructive">{review.aiAnalysisError}</span>
                <Button variant="outline" size="sm" onClick={() => onReEvaluate(review.objectiveId)}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Analisando saúde de execução...</span>
              </div>
            )}

            {/* KRs List */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Key Results ({review.krCount})
              </h4>
              {review.keyResults.map((kr) => (
                <KrHealthRow key={kr.id} kr={kr} />
              ))}
            </div>

            {/* AI Analysis */}
            {analysis && !isLoading && (
              <>
                {/* Summary */}
                <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
                  <p className="text-sm">{analysis.summary}</p>
                </div>

                {/* Strengths and Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.strengths?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pontos Fortes
                      </h5>
                      <ul className="space-y-1">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-green-600">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.risks?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Riscos Identificados
                      </h5>
                      <ul className="space-y-1">
                        {analysis.risks.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-red-600">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Suggested Actions */}
                {analysis.suggestedActions?.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <h5 className="text-xs font-medium text-primary flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Ações Sugeridas
                    </h5>
                    <ul className="space-y-1.5">
                      {analysis.suggestedActions.map((action, i) => (
                        <li key={i} className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg flex items-start gap-2">
                          <span className="text-primary font-medium">{i + 1}.</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Re-evaluate button */}
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => onReEvaluate(review.objectiveId)}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reavaliar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================
// KR HEALTH ROW COMPONENT
// ============================================================

function KrHealthRow({ kr }: { kr: OrgKrHealthData }) {
  const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
    }
  };

  const getStatusBadgeColor = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'text-green-600 bg-green-50';
      case 'yellow': return 'text-amber-600 bg-amber-50';
      case 'red': return 'text-red-600 bg-red-50';
    }
  };

  const formatCheckinTime = (date: string | null) => {
    if (!date) return 'Nunca';
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{kr.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>
              {kr.baseline ?? 'N/A'} → {kr.target ?? 'N/A'} {kr.unit || ''}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatCheckinTime(kr.lastCheckinAt)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <Badge className={cn("text-xs", getStatusBadgeColor(kr.status))}>
            {kr.progress}%
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <Progress 
        value={kr.progress} 
        className={cn("h-1.5", getStatusColor(kr.status))}
      />

      {/* Linked teams */}
      {kr.linkedTeams.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Users className="w-3 h-3 text-muted-foreground" />
          {kr.linkedTeams.map((team, i) => (
            <Badge key={team.teamId} variant="outline" className="text-[10px] py-0">
              {team.teamName} ({team.teamKrProgress}%)
            </Badge>
          ))}
        </div>
      )}

      {kr.linkedTeams.length === 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          Nenhum time contribuindo
        </div>
      )}
    </div>
  );
}
