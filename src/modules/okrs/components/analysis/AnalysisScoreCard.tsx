/**
 * AnalysisScoreCard - Card para exibir score de 0-10 com barra de progresso
 */

import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AnalysisScore } from "../../hooks";

interface AnalysisScoreCardProps {
  score: AnalysisScore;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onAskVic?: () => void;
}

const statusColors = {
  excellent: {
    bg: 'bg-success-muted',
    text: 'text-success-muted-foreground',
    progress: 'bg-success',
    border: 'border-success/30',
  },
  good: {
    bg: 'bg-info-muted',
    text: 'text-info-muted-foreground',
    progress: 'bg-info',
    border: 'border-info/30',
  },
  warning: {
    bg: 'bg-warning-muted',
    text: 'text-warning-muted-foreground',
    progress: 'bg-warning',
    border: 'border-warning/30',
  },
  critical: {
    bg: 'bg-danger-muted',
    text: 'text-danger-muted-foreground',
    progress: 'bg-danger',
    border: 'border-danger/30',
  },
};

export function AnalysisScoreCard({ 
  score, 
  icon, 
  className,
  onClick,
  onAskVic,
}: AnalysisScoreCardProps) {
  const colors = statusColors[score.status];
  const progressValue = (score.value / 10) * 100;

  return (
    <Card 
      className={cn(
        "border transition-all",
        colors.bg,
        colors.border,
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn("p-1.5 rounded-md", colors.bg)}>
                {icon}
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {score.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onAskVic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskVic();
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pedir sugestões ao Vic</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className={cn("text-2xl font-bold", colors.text)}>
              {score.value.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Progress 
            value={progressValue} 
            className="h-2 bg-muted"
          />
          <p className="text-xs text-muted-foreground line-clamp-2">
            {score.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
