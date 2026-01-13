/**
 * OrgOkrOverviewCard - Visão geral das OKRs organizacionais
 */

import { Target, TrendingUp, Link2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  className 
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
      color: linkagePercent >= 70 ? 'text-green-600' : linkagePercent >= 40 ? 'text-yellow-600' : 'text-red-600',
    },
    {
      icon: Users,
      label: 'Times com OKRs',
      value: `${teamsPercent}%`,
      subLabel: `${totals.teamsWithOkrs} de ${totals.totalTeams}`,
      color: teamsPercent >= 80 ? 'text-green-600' : teamsPercent >= 50 ? 'text-yellow-600' : 'text-red-600',
    },
  ];

  if (overallProgress !== undefined) {
    metrics.push({
      icon: TrendingUp,
      label: 'Progresso Médio',
      value: `${overallProgress}%`,
      color: overallProgress >= 70 ? 'text-green-600' : overallProgress >= 40 ? 'text-yellow-600' : 'text-red-600',
    });
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          OKRs Organizacionais
        </CardTitle>
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
