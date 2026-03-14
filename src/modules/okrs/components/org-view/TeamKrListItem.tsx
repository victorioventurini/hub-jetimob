import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-badge';
import { Users, Clock, History } from 'lucide-react';
import { formatValueWithUnit } from '@/shared/constants/units';
import { KrHistoryDialog } from '../KrHistoryDialog';
import { KrPrimaryKpiBadge } from '../ui';
import { usePrimaryKpiForKr } from '../../hooks';
import type { TeamKrLinked } from '../../hooks';

interface TeamKrListItemProps {
  teamKr: TeamKrLinked;
}

// Map OKR RAG status to shared StatusDot status
const ragToStatusMap: Record<string, string> = {
  green: 'on_track',
  yellow: 'at_risk',
  red: 'off_track',
  not_started: 'not_started',
};

const typeLabels = {
  contribution: 'Contribuição',
  enabler: 'Habilitador',
  foundational: 'Fundacional',
};

export function TeamKrListItem({ teamKr }: TeamKrListItemProps) {
  const [showHistory, setShowHistory] = useState(false);
  
  // v3.4.2: Check if KR has primary KPI linked
  const { hasPrimaryKpi, primaryKpi } = usePrimaryKpiForKr(teamKr.id, 'team');

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
    <>
      <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
        {/* Status indicator */}
        <StatusDot status={ragToStatusMap[teamKr.status] || 'not_started'} size="sm" className="mt-2" />

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

          {/* KR Title with Primary KPI badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium leading-tight">{teamKr.title}</p>
            {hasPrimaryKpi && primaryKpi && (
              <KrPrimaryKpiBadge
                kpiName={primaryKpi.kpiName}
                kpiId={primaryKpi.kpiId}
                direction={primaryKpi.direction}
                variant="compact"
                clickable
              />
            )}
          </div>

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

          {/* Footer: Type badge, owner, last checkin, history button */}
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

            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-3 h-3 mr-1" />
              Histórico
            </Button>
          </div>
        </div>
      </div>

      {/* History Dialog */}
      <KrHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        kr={{
          id: teamKr.id,
          title: teamKr.title,
          baseline: teamKr.baseline,
          current_value: teamKr.current_value,
          target: teamKr.target,
          unit: teamKr.unit,
          direction: teamKr.direction,
          status: teamKr.status,
          type: teamKr.type,
          owner_name: teamKr.owner_name,
          team_name: teamKr.team_name,
          objective_title: teamKr.team_objective_title,
        }}
      />
    </>
  );
}
