import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import type { OrgObjectiveWithKrs } from '../../hooks';
import { RAG_STATUS_COLORS } from '@/lib/colors';

interface OrgObjectiveHeaderProps {
  objective: OrgObjectiveWithKrs;
}

const statusConfig = {
  on_track: {
    label: 'On Track',
    color: `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
    icon: TrendingUp,
  },
  at_risk: {
    label: 'Em Risco',
    color: `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
    icon: AlertTriangle,
  },
  off_track: {
    label: 'Off Track',
    color: `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
    icon: XCircle,
  },
};

export function OrgObjectiveHeader({ objective }: OrgObjectiveHeaderProps) {
  const config = statusConfig[objective.aggregatedStatus];
  const StatusIcon = config.icon;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{objective.title}</h1>
              <p className="text-sm text-muted-foreground">Ciclo {objective.year}</p>
            </div>
          </div>
          {objective.description && (
            <p className="text-muted-foreground mt-2">{objective.description}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={config.color}>
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
            {config.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {objective.orgKrs.length} KR{objective.orgKrs.length !== 1 ? 's' : ''} organizacional{objective.orgKrs.length !== 1 ? 'is' : ''}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso Agregado</span>
          <span className="font-semibold">{objective.aggregatedProgress}%</span>
        </div>
        <Progress 
          value={objective.aggregatedProgress} 
          className="h-3"
        />
      </div>
    </div>
  );
}
