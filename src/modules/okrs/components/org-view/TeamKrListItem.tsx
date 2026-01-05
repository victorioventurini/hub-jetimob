import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Clock } from 'lucide-react';
import { formatValueWithUnit } from '../../constants/krUnits';
import type { TeamKrLinked } from '../../hooks/useOrgObjectiveView';

interface TeamKrListItemProps {
  teamKr: TeamKrLinked;
}

const statusColors = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  not_started: 'bg-gray-400',
};

const typeLabels = {
  contribution: 'Contribuição',
  enabler: 'Habilitador',
  foundational: 'Fundacional',
};

export function TeamKrListItem({ teamKr }: TeamKrListItemProps) {
  const initials = teamKr.owner_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const lastCheckinText = teamKr.last_checkin_at
    ? formatDistanceToNow(new Date(teamKr.last_checkin_at), { addSuffix: true, locale: ptBR })
    : 'Sem check-in';

  const isOverdue = !teamKr.last_checkin_at || 
    (new Date().getTime() - new Date(teamKr.last_checkin_at).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full mt-2 ${statusColors[teamKr.status]}`} />

      <div className="flex-1 min-w-0 space-y-2">
        {/* Team and Objective info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">{teamKr.team_name}</span>
          </div>
          {teamKr.team_objective_title && (
            <>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground truncate">
                {teamKr.team_objective_title}
              </span>
            </>
          )}
        </div>

        {/* KR Title */}
        <p className="text-sm font-medium leading-tight">{teamKr.title}</p>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-[200px]">
            <Progress value={teamKr.progress} className="h-1.5" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatValueWithUnit(teamKr.current_value, teamKr.unit)} / {formatValueWithUnit(teamKr.target, teamKr.unit)}
          </span>
          <span className="text-xs font-medium">{Math.round(teamKr.progress)}%</span>
        </div>

        {/* Footer: Type badge, owner, last checkin */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {typeLabels[teamKr.type]}
          </Badge>
          
          {teamKr.owner_name && (
            <div className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">{teamKr.owner_name}</span>
            </div>
          )}

          <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="w-3 h-3" />
            <span>{lastCheckinText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
