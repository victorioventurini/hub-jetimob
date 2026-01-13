/**
 * QualityOverviewCard - Card de visão geral da qualidade das OKRs
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityOverview } from "../../hooks/useTeamOkrQuality";

interface QualityOverviewCardProps {
  overview: QualityOverview;
  isLoading?: boolean;
}

export function QualityOverviewCard({ overview, isLoading }: QualityOverviewCardProps) {
  const { avgHealthScore, objectivesHealthy, objectivesAttention, objectivesRisk, totalObjectives } = overview;

  // Determine overall status
  const getOverallStatus = () => {
    if (avgHealthScore >= 75) return { label: 'Saudável', color: 'text-green-600', bgColor: 'bg-green-100', icon: TrendingUp };
    if (avgHealthScore >= 50) return { label: 'Atenção', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
    return { label: 'Em Risco', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle };
  };

  const status = getOverallStatus();
  const StatusIcon = status.icon;

  // Calculate percentages for distribution
  const healthyPercent = totalObjectives ? Math.round((objectivesHealthy / totalObjectives) * 100) : 0;
  const attentionPercent = totalObjectives ? Math.round((objectivesAttention / totalObjectives) * 100) : 0;
  const riskPercent = totalObjectives ? Math.round((objectivesRisk / totalObjectives) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="w-4 h-4 text-muted-foreground" />
          Score Geral de Qualidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main score */}
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-full", status.bgColor)}>
            <StatusIcon className={cn("w-6 h-6", status.color)} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", status.color)}>
                {avgHealthScore}%
              </span>
              <span className={cn("text-sm font-medium", status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalObjectives} objetivo{totalObjectives !== 1 ? 's' : ''} no ciclo
            </p>
          </div>
        </div>

        {/* Distribution bar */}
        <div className="space-y-2">
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
            {healthyPercent > 0 && (
              <div 
                className="bg-green-500 transition-all duration-300" 
                style={{ width: `${healthyPercent}%` }} 
              />
            )}
            {attentionPercent > 0 && (
              <div 
                className="bg-yellow-500 transition-all duration-300" 
                style={{ width: `${attentionPercent}%` }} 
              />
            )}
            {riskPercent > 0 && (
              <div 
                className="bg-red-500 transition-all duration-300" 
                style={{ width: `${riskPercent}%` }} 
              />
            )}
          </div>
          
          {/* Legend */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Saudável ({objectivesHealthy})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Atenção ({objectivesAttention})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Em Risco ({objectivesRisk})</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
