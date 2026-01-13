import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { AI_INSIGHT_STYLES, type AiInsightType } from "@/lib/colors";
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  ChevronDown,
  BookOpen,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type InsightType = "suggestion" | "warning" | "opportunity" | "tip";
export type InsightPriority = "high" | "medium" | "low";

export interface AiInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  agentName: string;
  actionLabel?: string;
  actionType?: "rewrite" | "adjust_target" | "cancel" | "create_initiative" | "link_kpi";
  metadata?: Record<string, unknown>;
}

interface AiInsightsCardProps {
  insights: AiInsight[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onActionClick?: (insight: AiInsight) => void;
  className?: string;
  title?: string;
  compact?: boolean;
}

const insightIcons: Record<InsightType, typeof Lightbulb> = {
  suggestion: Lightbulb,
  warning: AlertTriangle,
  opportunity: TrendingUp,
  tip: BookOpen,
};

const insightColors: Record<InsightType, string> = {
  suggestion: AI_INSIGHT_STYLES.suggestion.container,
  warning: AI_INSIGHT_STYLES.warning.container,
  opportunity: AI_INSIGHT_STYLES.opportunity.container,
  tip: AI_INSIGHT_STYLES.tip.container,
};

const priorityBadges: Record<InsightPriority, { label: string; variant: "default" | "secondary" | "outline" }> = {
  high: { label: "Alta", variant: "default" },
  medium: { label: "Média", variant: "secondary" },
  low: { label: "Baixa", variant: "outline" },
};

const actionIcons: Record<string, typeof Wrench> = {
  rewrite: BookOpen,
  adjust_target: Target,
  cancel: XCircle,
  create_initiative: CheckCircle2,
  link_kpi: TrendingUp,
};

function InsightItem({
  insight,
  onActionClick,
  compact = false,
}: {
  insight: AiInsight;
  onActionClick?: (insight: AiInsight) => void;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!compact);
  const Icon = insightIcons[insight.type];
  const colorClass = insightColors[insight.type];
  const ActionIcon = insight.actionType ? actionIcons[insight.actionType] : null;

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
              colorClass,
              "hover:opacity-80"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-sm font-medium truncate">{insight.title}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2 pb-1 px-2 space-y-2">
            <p className="text-xs text-muted-foreground">{insight.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">
                {insight.agentName}
              </Badge>
              {insight.actionLabel && onActionClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => onActionClick(insight)}
                >
                  {ActionIcon && <ActionIcon className="w-3 h-3" />}
                  {insight.actionLabel}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={cn("flex gap-3 p-3 rounded-lg", colorClass)}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium">{insight.title}</h4>
          <Badge {...priorityBadges[insight.priority]} className="text-[10px] shrink-0">
            {priorityBadges[insight.priority].label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            🤖 {insight.agentName}
          </Badge>
          {insight.actionLabel && onActionClick && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => onActionClick(insight)}
            >
              {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
              {insight.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiInsightsCard({
  insights,
  isLoading = false,
  onRefresh,
  onActionClick,
  className,
  title = "Insights da IA",
  compact = false,
}: AiInsightsCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {title}
            </CardTitle>
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="bg-muted/50 border-muted">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-sm">
              Nenhum insight disponível no momento. Os agentes de IA estão monitorando continuamente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Sort by priority
  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            {title}
            <Badge variant="secondary" className="text-[10px]">
              {insights.length}
            </Badge>
          </CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedInsights.map((insight) => (
            <InsightItem
              key={insight.id}
              insight={insight}
              onActionClick={onActionClick}
              compact={compact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Generate mock insights based on OKR data
 * This will be replaced by actual AI agent calls
 */
export function generateMockInsights(context: {
  objectiveTitle?: string;
  krProgress?: number;
  cycleElapsed?: number;
  hasLateInitiatives?: boolean;
  checkinsCount?: number;
}): AiInsight[] {
  const insights: AiInsight[] = [];

  // Check progress vs time elapsed
  if (context.krProgress !== undefined && context.cycleElapsed !== undefined) {
    const expectedProgress = context.cycleElapsed;
    const progressGap = expectedProgress - context.krProgress;

    if (progressGap > 20) {
      insights.push({
        id: "progress-gap",
        type: "warning",
        priority: "high",
        title: "Progresso abaixo do esperado",
        description: `O progresso atual (${Math.round(context.krProgress)}%) está ${Math.round(progressGap)}% abaixo do esperado para este ponto do ciclo.`,
        agentName: "Analista de KPIs",
        actionLabel: "Revisar target",
        actionType: "adjust_target",
      });
    }
  }

  // Check for missing check-ins
  if (context.checkinsCount !== undefined && context.checkinsCount < 2) {
    insights.push({
      id: "missing-checkins",
      type: "suggestion",
      priority: "medium",
      title: "Poucos check-ins registrados",
      description: "Check-ins regulares ajudam a manter visibilidade do progresso e identificar bloqueios cedo.",
      agentName: "Coach de OKRs",
      actionLabel: "Fazer check-in",
      actionType: "link_kpi",
    });
  }

  // Check for late initiatives
  if (context.hasLateInitiatives) {
    insights.push({
      id: "late-initiatives",
      type: "warning",
      priority: "medium",
      title: "Iniciativas atrasadas",
      description: "Existem iniciativas com prazo vencido. Considere revisar as prioridades ou redistribuir esforços.",
      agentName: "Coach de OKRs",
    });
  }

  // Generic tip if no issues
  if (insights.length === 0) {
    insights.push({
      id: "tip-review",
      type: "tip",
      priority: "low",
      title: "Dica de boas práticas",
      description: "Revise seus OKRs semanalmente e ajuste targets se necessário. Flexibilidade faz parte da metodologia.",
      agentName: "Coach de OKRs",
    });
  }

  return insights;
}
