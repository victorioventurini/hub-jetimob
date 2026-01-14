/**
 * ObjectiveChecklistCard - Card de avaliação de um objetivo com checklist + IA
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  type ObjectiveReview, 
  type ReviewCriterion,
  getStatusColor,
  getStatusLabel,
} from "../../types/construction-review";

interface ObjectiveChecklistCardProps {
  review: ObjectiveReview;
  criteria: ReviewCriterion[];
  onToggleCheckItem: (objectiveId: string, checkItemId: string) => void;
  onRequestAiAssessment: (objectiveId: string) => void;
}

export function ObjectiveChecklistCard({
  review,
  criteria,
  onToggleCheckItem,
  onRequestAiAssessment,
}: ObjectiveChecklistCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
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
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{review.teamName}</span>
                    <span>•</span>
                    <span>{review.krCount} KR{review.krCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Scores */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={cn("text-lg font-bold", getScoreColor(review.combinedScore))}>
                      {review.combinedScore}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                </div>

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
            {/* Checklist by criteria */}
            <div className="space-y-4">
              {criteria.map((criterion) => (
                <div key={criterion.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{criterion.name}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">{criterion.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-1.5 pl-2">
                    {criterion.checkItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-start gap-2 py-1"
                      >
                        <Checkbox
                          id={`${review.objectiveId}-${item.id}`}
                          checked={review.checklist[item.id] || false}
                          onCheckedChange={() => onToggleCheckItem(review.objectiveId, item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`${review.objectiveId}-${item.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {item.label}
                          </label>
                          {item.helpText && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.helpText}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Score progress */}
            <div className="flex items-center gap-4 py-2 px-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Checklist</span>
                  <span className="font-medium">{review.checklistScore}%</span>
                </div>
                <Progress value={review.checklistScore} className="h-2" />
              </div>
              
              {review.aiScore !== undefined && (
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">IA</span>
                    <span className="font-medium">{review.aiScore}%</span>
                  </div>
                  <Progress value={review.aiScore} className="h-2" />
                </div>
              )}
            </div>

            {/* AI Assessment section */}
            <div className="border-t pt-4">
              {review.aiAssessment ? (
                <AiAssessmentDisplay assessment={review.aiAssessment} />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Avaliação por IA</p>
                    <p className="text-xs text-muted-foreground">
                      Obtenha sugestões automáticas de melhoria
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRequestAiAssessment(review.objectiveId)}
                    disabled={review.aiAssessmentLoading}
                  >
                    {review.aiAssessmentLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Avaliar com IA
                      </>
                    )}
                  </Button>
                </div>
              )}

              {review.aiAssessmentError && (
                <p className="text-sm text-destructive mt-2">
                  {review.aiAssessmentError}
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================
// AI ASSESSMENT DISPLAY
// ============================================================

interface AiAssessmentDisplayProps {
  assessment: ObjectiveReview['aiAssessment'];
}

function AiAssessmentDisplay({ assessment }: AiAssessmentDisplayProps) {
  if (!assessment) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Avaliação IA</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Score: {assessment.overallScore}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        {assessment.summary}
      </p>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessment.strengths.length > 0 && (
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

        {assessment.improvements.length > 0 && (
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
    </div>
  );
}
