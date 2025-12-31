import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrOrgObjective, OkrTeamObjective, calculateProgress } from '../types';
import { OkrStatusBadge } from './OkrStatusBadge';
import { OkrProgressBar } from './OkrProgressBar';

interface OkrCardProps {
  objective: OkrOrgObjective | OkrTeamObjective;
  type: 'org' | 'team';
  onClick?: () => void;
  className?: string;
}

export function OkrCard({ objective, type, onClick, className }: OkrCardProps) {
  const keyResults = objective.key_results || [];
  const activeKrs = keyResults.filter(kr => !kr.deleted_at);
  
  // Calculate average progress
  const avgProgress = activeKrs.length > 0
    ? activeKrs.reduce((acc, kr) => {
        return acc + calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction);
      }, 0) / activeKrs.length
    : 0;

  // Determine overall status based on KRs
  const greenCount = activeKrs.filter(kr => kr.status === 'green').length;
  const yellowCount = activeKrs.filter(kr => kr.status === 'yellow').length;
  const redCount = activeKrs.filter(kr => kr.status === 'red').length;

  const getOwnerInitials = () => {
    if (objective.owner?.display_name) {
      return objective.owner.display_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '??';
  };

  return (
    <Card
      className={cn(
        'group hover:shadow-md transition-all cursor-pointer border-l-4',
        redCount > 0 && 'border-l-red-500',
        redCount === 0 && yellowCount > 0 && 'border-l-yellow-500',
        redCount === 0 && yellowCount === 0 && greenCount > 0 && 'border-l-green-500',
        activeKrs.length === 0 && 'border-l-muted',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {type === 'org' ? (
                <Badge variant="outline" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Organizacional
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {(objective as OkrTeamObjective).team?.name || 'Time'}
                </Badge>
              )}
              <OkrStatusBadge status={objective.status} type="objective" />
            </div>
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {objective.title}
            </CardTitle>
            {objective.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {objective.description}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-semibold">{avgProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                redCount > 0 && 'bg-red-500',
                redCount === 0 && yellowCount > 0 && 'bg-yellow-500',
                redCount === 0 && yellowCount === 0 && 'bg-green-500'
              )}
              style={{ width: `${avgProgress}%` }}
            />
          </div>

          {/* KR summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={objective.owner?.photo_url || undefined} />
                <AvatarFallback className="text-xs">{getOwnerInitials()}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {objective.owner?.display_name || 'Sem responsável'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {greenCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {greenCount}
                </span>
              )}
              {yellowCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  {yellowCount}
                </span>
              )}
              {redCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {redCount}
                </span>
              )}
              <span className="text-muted-foreground ml-1">
                {activeKrs.length} KR{activeKrs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
