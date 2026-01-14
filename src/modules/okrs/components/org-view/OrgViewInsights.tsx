import { useMemo } from 'react';
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrgObjectiveWithKrs } from '../../hooks';

interface OrgViewInsightsProps {
  objective: OrgObjectiveWithKrs;
}

interface Insight {
  type: 'warning' | 'info' | 'success';
  message: string;
}

export function OrgViewInsights({ objective }: OrgViewInsightsProps) {
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    // Count teams at risk per KR
    objective.orgKrs.forEach(kr => {
      const atRiskCount = kr.linkedTeamKrs.filter(tkr => tkr.status === 'red').length;
      if (atRiskCount > 0) {
        result.push({
          type: 'warning',
          message: `${atRiskCount} time${atRiskCount > 1 ? 's' : ''} ${atRiskCount > 1 ? 'estão' : 'está'} em risco no KR "${kr.title.length > 40 ? kr.title.substring(0, 40) + '...' : kr.title}"`,
        });
      }
    });

    // Check for KRs without team contributions
    const krsWithoutTeams = objective.orgKrs.filter(kr => kr.linkedTeamKrs.length === 0);
    if (krsWithoutTeams.length > 0) {
      result.push({
        type: 'info',
        message: `${krsWithoutTeams.length} KR${krsWithoutTeams.length > 1 ? 's' : ''} organizacional${krsWithoutTeams.length > 1 ? 'is' : ''} sem OKRs de times vinculados`,
      });
    }

    // Check for overdue checkins
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let overdueCount = 0;
    objective.orgKrs.forEach(kr => {
      kr.linkedTeamKrs.forEach(tkr => {
        if (!tkr.last_checkin_at || new Date(tkr.last_checkin_at) < sevenDaysAgo) {
          overdueCount++;
        }
      });
    });

    if (overdueCount > 0) {
      result.push({
        type: 'warning',
        message: `${overdueCount} OKR${overdueCount > 1 ? 's' : ''} de time${overdueCount > 1 ? 's' : ''} sem check-in há mais de 7 dias`,
      });
    }

    // Check dominant team
    const teamContributions = new Map<string, number>();
    objective.orgKrs.forEach(kr => {
      kr.linkedTeamKrs.forEach(tkr => {
        const current = teamContributions.get(tkr.team_name) || 0;
        teamContributions.set(tkr.team_name, current + 1);
      });
    });

    const totalContributions = Array.from(teamContributions.values()).reduce((a, b) => a + b, 0);
    
    if (totalContributions > 2) {
      const dominant = Array.from(teamContributions.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (dominant && dominant[1] / totalContributions > 0.5) {
        result.push({
          type: 'info',
          message: `Este objetivo depende majoritariamente do time ${dominant[0]} (${Math.round(dominant[1] / totalContributions * 100)}% das contribuições)`,
        });
      }
    }

    // Success insight if everything is on track
    if (result.filter(r => r.type === 'warning').length === 0) {
      const greenKrs = objective.orgKrs.filter(kr => kr.status === 'green').length;
      if (greenKrs > 0 && greenKrs >= objective.orgKrs.length / 2) {
        result.push({
          type: 'success',
          message: `${greenKrs} de ${objective.orgKrs.length} KRs estão no caminho certo`,
        });
      }
    }

    return result;
  }, [objective]);

  if (insights.length === 0) return null;

  const iconMap = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
  };

  const colorMap = {
    warning: 'text-yellow-600 bg-yellow-50',
    info: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight, index) => {
          const Icon = iconMap[insight.type];
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2 p-3 rounded-lg ${colorMap[insight.type]}`}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{insight.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
