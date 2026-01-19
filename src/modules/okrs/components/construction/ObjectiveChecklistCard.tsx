/**
 * ObjectiveChecklistCard - Card de avaliação AUTOMÁTICA de um objetivo por IA
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
  Sparkles, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Target,
  RefreshCw,
  AlertCircle,
  Link2,
} from "lucide-react";
import { 
  type ObjectiveReview, 
  type ReviewCriterion,
  type KrFeedback,
  getStatusColor,
  getStatusLabel,
} from "../../types/construction-review";

interface ObjectiveChecklistCardProps {
  review: ObjectiveReview;
  criteria: ReviewCriterion[];
  onReEvaluate: (objectiveId: string) => void;
}

export function ObjectiveChecklistCard({
  review,
  criteria,
  onReEvaluate,
}: ObjectiveChecklistCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const isLoading = review.aiAssessmentLoading;
  const hasError = !!review.aiAssessmentError;
  const assessment = review.aiAssessment;

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
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{review.teamName}</span>
                    <span>•</span>
                    <span>{review.krCount} KR{review.krCount !== 1 ? 's' : ''}</span>
                    {review.orgObjectiveTitle && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Vinculado
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Score */}
                {isLoading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Analisando OKR com IA...</span>
                  </div>
                ) : hasError ? (
                  <div className="flex items-center gap-1 text-destructive text-xs">
                    <AlertCircle className="w-4 h-4" />
                    Erro
                  </div>
                ) : (
                  <div className="text-right">
                    <div className={cn("text-lg font-bold", getScoreColor(review.score))}>
                      {review.score}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                )}

                {/* Status badge */}
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getStatusColor(review.status))}
                >
                  {getStatusLabel(review.status)}
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
                <span className="text-sm text-destructive">{review.aiAssessmentError}</span>
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
                <span>Analisando OKR com IA...</span>
              </div>
            )}

            {/* AI Assessment */}
            {assessment && !isLoading && (
              <>
                {/* Summary */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">{assessment.summary}</p>
                </div>

                {/* Criteria scores */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {criteria.map((c) => {
                    const criteriaScore = assessment.criteriaScores?.[c.id];
                    return (
                      <div key={c.id} className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className={cn("text-lg font-bold", getScoreColor(criteriaScore?.score || 0))}>
                          {criteriaScore?.score || 0}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{c.name}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Strengths and Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assessment.strengths?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pontos Fortes
                      </h5>
                      <ul className="space-y-1">
                        {assessment.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {assessment.improvements?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sugestões de Melhoria
                      </h5>
                      <ul className="space-y-1">
                        {assessment.improvements.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Alignment suggestion */}
                {assessment.alignmentSuggestion && (
                  <div className="border-t pt-3">
                    <h5 className="text-xs font-medium text-primary flex items-center gap-1 mb-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      Alinhamento Estratégico
                    </h5>
                    <p className="text-xs text-muted-foreground bg-primary/5 p-2.5 rounded-lg">
                      {assessment.alignmentSuggestion}
                    </p>
                  </div>
                )}

                {/* KR Feedback */}
                {assessment.krFeedback?.length > 0 && (
                  <div className="border-t pt-3 space-y-3">
                    <h5 className="text-xs font-medium">Análise por Key Result</h5>
                    {assessment.krFeedback.map((kr) => (
                      <KrFeedbackCard key={kr.krId} feedback={kr} />
                    ))}
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
// KR FEEDBACK CARD
// ============================================================

function KrFeedbackCard({ feedback }: { feedback: KrFeedback }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success-muted';
    if (score >= 50) return 'text-warning bg-warning-muted';
    return 'text-danger bg-danger-muted';
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{feedback.krTitle}</p>
          {feedback.isTask && (
            <Badge variant="destructive" className="text-[10px] mt-1">
              ⚠️ Parece ser Task
            </Badge>
          )}
        </div>
        <Badge className={cn("shrink-0", getScoreColor(feedback.score))}>
          {feedback.score}
        </Badge>
      </div>

      {feedback.improvements?.length > 0 && (
        <div className="space-y-1">
          {feedback.improvements.map((imp, i) => (
            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="text-amber-600">→</span>
              {imp}
            </p>
          ))}
        </div>
      )}

      {feedback.strengths?.length > 0 && (
        <div className="space-y-1">
          {feedback.strengths.map((str, i) => (
            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="text-green-600">✓</span>
              {str}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
