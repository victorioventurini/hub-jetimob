import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users, Plus, MoreHorizontal, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from './OkrStatusBadge';
import { OkrProgressBar } from './OkrProgressBar';
import { useTeamKeyResults } from '../hooks/useOkrData';
import { CreateTeamKrDialog } from './CreateTeamKrDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TeamObjectiveCardProps {
  objective: {
    id: string;
    title: string;
    description?: string | null;
    team_id: string;
    org_objective_id: string;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
  };
  teams: Array<{ id: string; name: string }>;
}

export function TeamObjectiveCard({ objective, teams }: TeamObjectiveCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const { data: allKeyResults, isLoading } = useTeamKeyResults(objective.team_id);

  const teamName = teams.find(t => t.id === objective.team_id)?.name || 'Time';
  
  // Filter KRs for this objective
  const objectiveKrs = allKeyResults?.filter(kr => kr.team_objective_id === objective.id && !kr.deleted_at) || [];
  
  // Calculate average progress
  const avgProgress = objectiveKrs.length > 0
    ? objectiveKrs.reduce((acc, kr) => {
        const direction = kr.direction as 'up' | 'down';
        if (direction === 'up') {
          if (kr.target === kr.baseline) return acc + (kr.current_value >= kr.target ? 100 : 0);
          return acc + Math.max(0, Math.min(100, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100));
        } else {
          if (kr.baseline === kr.target) return acc + (kr.current_value <= kr.target ? 100 : 0);
          return acc + Math.max(0, Math.min(100, ((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100));
        }
      }, 0) / objectiveKrs.length
    : 0;

  // Count KR statuses
  const greenCount = objectiveKrs.filter(kr => kr.status === 'green').length;
  const yellowCount = objectiveKrs.filter(kr => kr.status === 'yellow').length;
  const redCount = objectiveKrs.filter(kr => kr.status === 'red').length;

  return (
    <>
      <Card className={cn(
        'group transition-all border-l-4',
        redCount > 0 && 'border-l-red-500',
        redCount === 0 && yellowCount > 0 && 'border-l-yellow-500',
        redCount === 0 && yellowCount === 0 && greenCount > 0 && 'border-l-green-500',
        objectiveKrs.length === 0 && 'border-l-muted'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {teamName}
                </Badge>
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
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
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
                  {objectiveKrs.length} KR{objectiveKrs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddKrDialog(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar KR
              </Button>
            </div>
          </div>

          {/* Expanded KR list */}
          {expanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Key Results
              </p>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : objectiveKrs.length > 0 ? (
                objectiveKrs.map((kr, index) => (
                  <div
                    key={kr.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{kr.title}</p>
                        <OkrProgressBar
                          baseline={kr.baseline}
                          current={kr.current_value}
                          target={kr.target}
                          direction={kr.direction as 'up' | 'down'}
                          status={kr.status as 'green' | 'yellow' | 'red' | 'not_started'}
                          unit={kr.unit}
                          size="sm"
                          className="mt-2"
                        />
                      </div>
                      <OkrStatusBadge status={kr.status as 'green' | 'yellow' | 'red' | 'not_started'} type="kr" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhum Key Result definido ainda.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTeamKrDialog
        open={showAddKrDialog}
        onOpenChange={setShowAddKrDialog}
        objectiveId={objective.id}
        teamId={objective.team_id}
      />
    </>
  );
}
