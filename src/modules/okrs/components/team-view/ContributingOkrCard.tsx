import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrProgressBar } from '../OkrProgressBar';
import { OkrStatusBadge } from '../OkrStatusBadge';
import { calculateProgress, OkrRagStatus } from '../../types';

interface ContributingOkrCardProps {
  objective: {
    id: string;
    title: string;
    description?: string;
    status: string;
    is_shared: boolean;
    responsibility_model?: string | null;
    team_id: string;
    team?: {
      id: string;
      name: string;
    };
    key_results?: Array<{
      id: string;
      title: string;
      baseline: number;
      current_value: number;
      target: number;
      direction: 'up' | 'down';
      unit: string;
      status: OkrRagStatus;
    }>;
  };
  currentTeamId: string;
}

/**
 * Card component for displaying shared OKRs where the current team
 * is a contributor (not the primary team).
 */
export function ContributingOkrCard({
  objective,
  currentTeamId,
}: ContributingOkrCardProps) {
  const isPrimaryTeam = objective.team_id === currentTeamId;
  const primaryTeamName = objective.team?.name || 'Time não definido';
  
  // Calculate overall objective progress
  const krs = objective.key_results || [];
  const avgProgress = krs.length > 0
    ? krs.reduce((acc, kr) => {
        return acc + calculateProgress(
          kr.baseline,
          kr.current_value,
          kr.target,
          kr.direction
        );
      }, 0) / krs.length
    : 0;

  return (
    <Card className={cn(
      "transition-all border-l-4",
      "border-l-status-purple",
      "hover:shadow-md"
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge 
                variant="outline" 
                className="bg-status-purple-muted text-status-purple border-status-purple/30"
              >
                <Users className="w-3 h-3 mr-1" />
                Compartilhada
              </Badge>
              <OkrStatusBadge status={objective.status as any} />
            </div>
            <h3 className="font-medium text-base line-clamp-2">{objective.title}</h3>
            {objective.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {objective.description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0"
          >
            <Link to={`/okrs/team/${objective.team_id}`}>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Primary Team Info */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mb-3">
          <Crown className="w-4 h-4 text-warning" />
          <span className="text-sm">
            <span className="text-muted-foreground">Time primário:</span>{' '}
            <span className="font-medium">{primaryTeamName}</span>
          </span>
          {objective.responsibility_model && (
            <Badge variant="outline" className="ml-auto text-xs">
              {objective.responsibility_model === 'collaborative' 
                ? 'Colaborativo' 
                : 'Líder + Contribuidores'}
            </Badge>
          )}
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Users className="w-3 h-3" />
          <span>Seu time contribui para esta OKR</span>
        </div>

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{avgProgress.toFixed(0)}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
          
          {krs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {krs.length} Key Result{krs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
