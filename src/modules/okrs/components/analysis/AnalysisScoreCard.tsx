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
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-400',
    progress: 'bg-green-500',
    border: 'border-green-200 dark:border-green-900',
  },
  good: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    progress: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-900',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    progress: 'bg-yellow-500',
    border: 'border-yellow-200 dark:border-yellow-900',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    progress: 'bg-red-500',
    border: 'border-red-200 dark:border-red-900',
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
