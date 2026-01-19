/**
 * OrgOkrOverviewCard - Visão geral das OKRs organizacionais
 */

import { Target, TrendingUp, Link2, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OrgOkrOverviewCardProps {
  totals: {
    orgObjectives: number;
    orgKrs: number;
    totalTeams: number;
    teamsWithOkrs: number;
    linkedKrs: number;
    unlinkedKrs: number;
  };
  overallProgress?: number;
  className?: string;
  onAnalyze?: () => void;
}

interface MetricItem {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subLabel?: string;
  color?: string;
}

export function OrgOkrOverviewCard({ 
  totals, 
  overallProgress,
  className,
  onAnalyze,
}: OrgOkrOverviewCardProps) {
  const linkagePercent = totals.orgKrs > 0 
    ? Math.round((totals.linkedKrs / totals.orgKrs) * 100) 
    : 0;

  const teamsPercent = totals.totalTeams > 0 
    ? Math.round((totals.teamsWithOkrs / totals.totalTeams) * 100) 
    : 0;

  const metrics: MetricItem[] = [
    {
      icon: Target,
      label: 'Objetivos Org',
      value: totals.orgObjectives,
      subLabel: `${totals.orgKrs} KRs`,
    },
    {
      icon: Link2,
      label: 'KRs Vinculados',
      value: `${linkagePercent}%`,
      subLabel: `${totals.linkedKrs} de ${totals.orgKrs}`,
      color: linkagePercent >= 70 ? 'text-success' : linkagePercent >= 40 ? 'text-warning' : 'text-danger',
    },
    {
      icon: Users,
      label: 'Times com OKRs',
      value: `${teamsPercent}%`,
      subLabel: `${totals.teamsWithOkrs} de ${totals.totalTeams}`,
      color: teamsPercent >= 80 ? 'text-success' : teamsPercent >= 50 ? 'text-warning' : 'text-danger',
    },
  ];

  if (overallProgress !== undefined) {
    metrics.push({
      icon: TrendingUp,
      label: 'Progresso Médio',
      value: `${overallProgress}%`,
      color: overallProgress >= 70 ? 'text-success' : overallProgress >= 40 ? 'text-warning' : 'text-danger',
    });
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            OKRs Organizacionais
          </CardTitle>
          {onAnalyze && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={onAnalyze}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pedir insights ao Vic</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-3"
              >
                <div className="p-2 rounded-md bg-muted shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className={cn(
                    "text-lg font-semibold",
                    metric.color || "text-foreground"
                  )}>
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  {metric.subLabel && (
                    <p className="text-xs text-muted-foreground/70">{metric.subLabel}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
