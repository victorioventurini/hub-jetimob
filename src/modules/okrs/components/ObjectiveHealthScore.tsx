import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Heart, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Gauge,
  Clock,
  Target,
  ListTodo,
} from "lucide-react";
import { useState } from "react";
import { 
  type ObjectiveHealth, 
  type HealthFactor, 
  type HealthLevel,
  getHealthLevelConfig,
  calculateObjectiveHealth,
} from "../utils/healthScore";
import type { OkrRagStatus } from "../types";
import type { Cycle } from "../hooks";
import type { InitiativeStatus } from "../types/initiative";
import { cn } from "@/lib/utils";

interface ObjectiveHealthBadgeProps {
  health: ObjectiveHealth;
  className?: string;
  showScore?: boolean;
  size?: "sm" | "md";
}

/**
 * Compact badge showing objective health
 */
export function ObjectiveHealthBadge({ health, showScore = false, size = "sm" }: ObjectiveHealthBadgeProps) {
  const config = getHealthLevelConfig(health.level);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "cursor-help border-0",
            config.bgColor,
            config.color,
            size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5"
          )}
        >
          <Heart className={cn("mr-1", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
          {config.label}
          {showScore && <span className="ml-1 font-mono">{health.score}%</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm font-medium mb-1">
          {config.emoji} Saúde: {config.label} ({health.score}%)
        </p>
        <p className="text-xs text-muted-foreground">{health.summary}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ObjectiveHealthCardProps {
  health: ObjectiveHealth;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Full health card with details
 */
export function ObjectiveHealthCard({ health, className, defaultExpanded = false }: ObjectiveHealthCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = getHealthLevelConfig(health.level);

  const getFactorIcon = (factorId: string) => {
    switch (factorId) {
      case "kr_progress":
        return Gauge;
      case "rag_status":
        return Target;
      case "checkin_frequency":
        return Clock;
      case "kpi_trend":
        return health.factors.find(f => f.id === factorId)?.status === "good" ? TrendingUp : TrendingDown;
      case "late_initiatives":
        return ListTodo;
      case "cycle_alignment":
        return Clock;
      default:
        return Info;
    }
  };

  const getStatusIcon = (status: HealthFactor["status"]) => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "bad":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className={cn("py-3", config.bgColor)}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", config.bgColor)}>
                  <Heart className={cn("w-5 h-5", config.color)} />
                </div>
                <div className="text-left">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Saúde do Objetivo
                    <span className={cn("font-mono", config.color)}>{health.score}%</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    {health.summary}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-4">
            {/* Overall progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Score geral</span>
                <span className={cn("font-medium", config.color)}>{health.score}%</span>
              </div>
              <Progress 
                value={health.score} 
                className="h-2"
              />
            </div>

            {/* Factors list */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fatores analisados
              </p>
              {health.factors.map((factor) => {
                const FactorIcon = getFactorIcon(factor.id);
                return (
                  <div key={factor.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                    <FactorIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{factor.name}</span>
                        {getStatusIcon(factor.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {factor.message}
                      </p>
                      <div className="mt-2">
                        <Progress 
                          value={factor.score} 
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <Info className="w-3 h-3 inline mr-1" />
                O Health Score é calculado automaticamente com base em múltiplos fatores e não substitui a análise humana.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ObjectiveHealthSummaryProps {
  krs: Array<{
    id: string;
    status: OkrRagStatus;
    current_value: number;
    baseline: number;
    target: number;
    direction: "up" | "down";
    lastCheckinDate?: string | null;
  }>;
  initiatives: Array<{
    id: string;
    status: InitiativeStatus;
    expected_end_date?: string | null;
  }>;
  cycle: Cycle | null;
  primaryKpiTrend?: "up" | "down" | "stable" | null;
  variant?: "badge" | "card" | "inline";
  className?: string;
}

/**
 * Smart component that calculates and displays health
 */
export function ObjectiveHealthSummary({ 
  krs, 
  initiatives, 
  cycle, 
  primaryKpiTrend,
  variant = "badge",
  className,
}: ObjectiveHealthSummaryProps) {
  const health = calculateObjectiveHealth({
    krs,
    initiatives,
    cycle,
    primaryKpiTrend,
  });

  if (variant === "card") {
    return <ObjectiveHealthCard health={health} className={className} />;
  }

  if (variant === "inline") {
    const config = getHealthLevelConfig(health.level);
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Heart className={cn("w-4 h-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          ({health.score}%)
        </span>
      </div>
    );
  }

  return <ObjectiveHealthBadge health={health} className={className} />;
}
