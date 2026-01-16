/**
 * QualityInsightsPanel - Painel de insights sobre qualidade das OKRs
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  AlertTriangle, 
  Clock, 
  Ban,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityOverview } from "../../hooks";

interface KrMetrics {
  totalKrs: number;
  krsUpdatedOnTime: number;
  krsUpdatedLate: number;
  krsNoUpdate: number;
  krsAtRisk: number;
  krsStagnant: number;
  initiativesCritical: number;
}

interface QualityInsightsPanelProps {
  overview: QualityOverview;
  metrics: KrMetrics;
  isLoading?: boolean;
}

interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: React.ElementType;
  title: string;
  description: string;
}

function generateInsights(overview: QualityOverview, metrics: KrMetrics): Insight[] {
  const insights: Insight[] = [];

  // Critical: Objectives at risk
  if (overview.objectivesRisk > 0) {
    insights.push({
      id: 'objectives-risk',
      type: 'critical',
      icon: AlertTriangle,
      title: `${overview.objectivesRisk} objetivo${overview.objectivesRisk > 1 ? 's' : ''} em risco`,
      description: 'Objetivos com score de saúde abaixo de 50% precisam de atenção imediata.',
    });
  }

  // Warning: Stagnant KRs
  if (metrics.krsStagnant > 0) {
    insights.push({
      id: 'stagnant-krs',
      type: 'warning',
      icon: Clock,
      title: `${metrics.krsStagnant} KR${metrics.krsStagnant > 1 ? 's' : ''} estagnado${metrics.krsStagnant > 1 ? 's' : ''}`,
      description: 'KRs sem atualização há mais de 14 dias podem indicar bloqueios ou falta de progresso.',
    });
  }

  // Warning: Blocked initiatives
  if (metrics.initiativesCritical > 0) {
    insights.push({
      id: 'blocked-initiatives',
      type: 'critical',
      icon: Ban,
      title: `${metrics.initiativesCritical} iniciativa${metrics.initiativesCritical > 1 ? 's' : ''} bloqueada${metrics.initiativesCritical > 1 ? 's' : ''}`,
      description: 'Iniciativas bloqueadas podem impedir o progresso dos Key Results.',
    });
  }

  // Warning: KRs at risk
  if (metrics.krsAtRisk > 0) {
    insights.push({
      id: 'krs-at-risk',
      type: 'warning',
      icon: AlertTriangle,
      title: `${metrics.krsAtRisk} KR${metrics.krsAtRisk > 1 ? 's' : ''} com status de risco`,
      description: 'KRs com status amarelo ou vermelho precisam de um plano de ação.',
    });
  }

  // Success: Good update rate
  const updateRate = metrics.totalKrs > 0 
    ? Math.round((metrics.krsUpdatedOnTime / metrics.totalKrs) * 100)
    : 0;
  
  if (updateRate >= 80) {
    insights.push({
      id: 'good-update-rate',
      type: 'success',
      icon: CheckCircle,
      title: 'Excelente ritmo de atualizações',
      description: `${updateRate}% dos KRs estão sendo atualizados no prazo. Continue assim!`,
    });
  }

  // Success: High average health
  if (overview.avgHealthScore >= 80 && overview.totalObjectives > 0) {
    insights.push({
      id: 'high-health',
      type: 'success',
      icon: TrendingUp,
      title: 'OKRs em ótima saúde',
      description: `Score médio de ${overview.avgHealthScore}% indica boa execução das OKRs.`,
    });
  }

  // Info: No objectives
  if (overview.totalObjectives === 0) {
    insights.push({
      id: 'no-objectives',
      type: 'info',
      icon: Lightbulb,
      title: 'Nenhum objetivo definido',
      description: 'Cadastre objetivos para este ciclo para começar a acompanhar a qualidade.',
    });
  }

  return insights;
}

const typeStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
};

export function QualityInsightsPanel({ overview, metrics, isLoading }: QualityInsightsPanelProps) {
  const insights = generateInsights(overview, metrics);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground" />
          Insights de Qualidade
          {insights.length > 0 && (
            <Badge variant="secondary" className="ml-auto font-normal">
              {insights.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum insight disponível no momento.</p>
          </div>
        ) : (
          insights.map((insight) => {
            const styles = typeStyles[insight.type];
            const Icon = insight.icon;
            
            return (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  styles.bg,
                  styles.border
                )}
              >
                <div className={cn("p-1.5 rounded-md", styles.bg)}>
                  <Icon className={cn("w-4 h-4", styles.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
