import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedOkrInsightsProps {
  sharedOkrsCount: number;
  totalOkrsCount: number;
  overdueSharedOkrsCount: number;
  teamsWithMostDependencies?: Array<{ name: string; count: number }>;
  className?: string;
}

interface Insight {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  icon: typeof Lightbulb;
}

/**
 * Component that displays automated insights about shared OKRs.
 * These insights are informative and help users understand dependencies.
 */
export function SharedOkrInsights({
  sharedOkrsCount,
  totalOkrsCount,
  overdueSharedOkrsCount,
  teamsWithMostDependencies = [],
  className,
}: SharedOkrInsightsProps) {
  const insights: Insight[] = [];
  
  // Insight: Number of shared OKRs
  if (sharedOkrsCount > 0) {
    insights.push({
      id: 'shared-count',
      message: `${sharedOkrsCount} OKR${sharedOkrsCount > 1 ? 's' : ''} envolve${sharedOkrsCount === 1 ? '' : 'm'} múltiplos times.`,
      type: 'info',
      icon: Users,
    });
  }

  // Insight: Percentage of shared OKRs
  if (totalOkrsCount > 0 && sharedOkrsCount > 0) {
    const percentage = Math.round((sharedOkrsCount / totalOkrsCount) * 100);
    if (percentage > 50) {
      insights.push({
        id: 'high-collaboration',
        message: `${percentage}% das OKRs são colaborativas. Alto nível de alinhamento entre times.`,
        type: 'success',
        icon: TrendingUp,
      });
    } else if (percentage < 20 && sharedOkrsCount > 0) {
      insights.push({
        id: 'low-collaboration',
        message: `Apenas ${percentage}% das OKRs são compartilhadas. Considere mais colaboração entre times.`,
        type: 'info',
        icon: Link2,
      });
    }
  }

  // Insight: Overdue shared OKRs
  if (overdueSharedOkrsCount > 0) {
    insights.push({
      id: 'overdue-shared',
      message: `${overdueSharedOkrsCount} OKR${overdueSharedOkrsCount > 1 ? 's' : ''} compartilhada${overdueSharedOkrsCount > 1 ? 's' : ''} sem check-in recente.`,
      type: 'warning',
      icon: Clock,
    });
  }

  // Insight: Teams with most dependencies
  if (teamsWithMostDependencies.length > 0) {
    const topTeam = teamsWithMostDependencies[0];
    if (topTeam.count >= 3) {
      insights.push({
        id: 'team-dependencies',
        message: `${topTeam.name} participa de ${topTeam.count} OKRs compartilhadas.`,
        type: 'info',
        icon: Users,
      });
    }
  }

  // If no insights, don't render anything
  if (insights.length === 0) {
    return null;
  }

  const getInsightStyle = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-status-yellow-muted border-status-yellow/30 text-status-yellow-muted-foreground dark:bg-status-yellow-muted dark:border-status-yellow/30';
      case 'success':
        return 'bg-status-green-muted border-status-green/30 text-status-green-muted-foreground dark:bg-status-green-muted dark:border-status-green/30';
      default:
        return 'bg-info-muted border-info/30 text-info-muted-foreground dark:bg-info-muted dark:border-info/30';
    }
  };

  return (
    <Card className={cn("bg-muted/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Insights</span>
        </div>
        
        <div className="space-y-2">
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md border text-sm",
                  getInsightStyle(insight.type)
                )}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{insight.message}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
