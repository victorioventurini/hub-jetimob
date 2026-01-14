import { Lightbulb, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamContributionData } from "../../hooks";

interface TeamContributionInsightsProps {
  data: TeamContributionData;
}

interface Insight {
  icon: React.ElementType;
  text: string;
  type: 'info' | 'warning' | 'success';
}

export function TeamContributionInsights({ data }: TeamContributionInsightsProps) {
  const insights: Insight[] = [];

  // Insight: Number of org objectives impacted
  if (data.contributions.length > 0) {
    insights.push({
      icon: Target,
      text: `Este time contribui para ${data.contributions.length} Objetivo${data.contributions.length !== 1 ? 's' : ''} Organizacional${data.contributions.length !== 1 ? 'is' : ''}.`,
      type: 'info',
    });
  } else {
    insights.push({
      icon: AlertTriangle,
      text: 'Este time não possui OKRs vinculados a Objetivos Organizacionais.',
      type: 'warning',
    });
  }

  // Insight: Main contribution area
  if (data.contributions.length > 1) {
    const mainContribution = data.contributions.reduce((max, c) => 
      c.totalTeamOkrs > max.totalTeamOkrs ? c : max
    );
    insights.push({
      icon: TrendingUp,
      text: `A maior parte do impacto está concentrada no Objetivo "${mainContribution.title}".`,
      type: 'info',
    });
  }

  // Insight: At risk OKRs
  const atRiskOkrs = data.contributions.flatMap(c => 
    c.orgKrs.flatMap(kr => kr.teamOkrs.filter(okr => okr.status === 'at_risk'))
  );
  if (atRiskOkrs.length > 0) {
    insights.push({
      icon: AlertTriangle,
      text: `${atRiskOkrs.length} OKR${atRiskOkrs.length !== 1 ? 's' : ''} em risco que afeta${atRiskOkrs.length !== 1 ? 'm' : ''} contribuições organizacionais.`,
      type: 'warning',
    });
  }

  // Insight: Off track OKRs
  const offTrackOkrs = data.contributions.flatMap(c => 
    c.orgKrs.flatMap(kr => kr.teamOkrs.filter(okr => okr.status === 'off_track'))
  );
  if (offTrackOkrs.length > 0) {
    insights.push({
      icon: AlertTriangle,
      text: `${offTrackOkrs.length} OKR${offTrackOkrs.length !== 1 ? 's' : ''} off track precisa${offTrackOkrs.length !== 1 ? 'm' : ''} de atenção imediata.`,
      type: 'warning',
    });
  }

  // Insight: Critical for objective
  const criticalContributions = data.contributions.filter(c => {
    const teamOkrCount = c.totalTeamOkrs;
    const totalKrOkrs = c.orgKrs.reduce((sum, kr) => sum + kr.teamOkrs.length, 0);
    return teamOkrCount >= totalKrOkrs * 0.5 && totalKrOkrs > 0;
  });
  if (criticalContributions.length > 0) {
    insights.push({
      icon: Target,
      text: `Este time é crítico para o sucesso de ${criticalContributions.length} Objetivo${criticalContributions.length !== 1 ? 's' : ''}.`,
      type: 'success',
    });
  }

  // Insight: Good progress
  if (data.aggregatedProgress >= 70) {
    insights.push({
      icon: TrendingUp,
      text: 'Excelente progresso! O time está bem posicionado para atingir suas metas.',
      type: 'success',
    });
  }

  const iconColors = {
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    success: 'text-green-500',
  };

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Insights do Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.slice(0, 5).map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div 
              key={index} 
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColors[insight.type]}`} />
              <span>{insight.text}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
