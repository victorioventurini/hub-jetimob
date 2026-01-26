import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users, Plus, MoreHorizontal, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from './OkrStatusBadge';
import { OkrProgressBar } from './OkrProgressBar';
import { SharedOkrBadge } from './SharedOkrBadge';
import { KrActionButtons } from './KrActionButtons';
import { useTeamKeyResults, useObjectiveContributors } from '../hooks';
import { useBu } from '@/contexts/BuContext';
import { TeamKrFormDialog } from './TeamKrFormDialog';
import { CheckinDialog } from './CheckinDialog';
import { TeamObjectiveFormDialog } from './TeamObjectiveFormDialog';
import type { OkrStatus, OkrRagStatus, OkrDirection, OkrKrType } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVic, useVicEnabled } from '@/modules/vic';

interface TeamObjectiveCardProps {
  objective: {
    id: string;
    title: string;
    description?: string | null;
    team_id: string;
    org_objective_id: string;
    status: OkrStatus;
    is_shared?: boolean;
    responsibility_model?: string | null;
    bu_id?: string | null;
  };
  teams: Array<{ id: string; name: string }>;
  currentTeamId?: string; // To determine if viewing team is primary or contributor
}

export function TeamObjectiveCard({ objective, teams, currentTeamId }: TeamObjectiveCardProps) {
  const { currentBu } = useBu();
  const [expanded, setExpanded] = useState(false);
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [checkinKr, setCheckinKr] = useState<{
    id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    direction: 'up' | 'down';
    unit: string;
    status: 'green' | 'yellow' | 'red' | 'not_started';
    team_id: string;
  } | null>(null);
  const [editingKr, setEditingKr] = useState<{
    id: string;
    team_id: string;
    team_objective_id?: string | null;
    title: string;
    type: OkrKrType;
    baseline: number;
    current_value: number;
    target: number;
    direction: OkrDirection;
    unit: string;
    status: OkrRagStatus;
    owner_user_id?: string | null;
  } | null>(null);
  const { data: allKeyResults, isLoading } = useTeamKeyResults(objective.bu_id || currentBu?.id, objective.team_id);
  const { data: contributors } = useObjectiveContributors(objective.is_shared ? objective.id : undefined);
  const { openPanel } = useVic();
  const { isEnabled: vicEnabled } = useVicEnabled();

  const teamName = teams.find(t => t.id === objective.team_id)?.name || 'Time';
  const isPrimaryTeam = !currentTeamId || currentTeamId === objective.team_id;
  
  // Get contributing team names
  const contributingTeams = contributors?.map(c => ({
    id: c.team_id,
    name: c.team?.name || 'Time desconhecido',
  })) || [];
  
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
        redCount > 0 && 'border-l-danger',
        redCount === 0 && yellowCount > 0 && 'border-l-warning',
        redCount === 0 && yellowCount === 0 && greenCount > 0 && 'border-l-success',
        objectiveKrs.length === 0 && 'border-l-muted',
        objective.is_shared && 'ring-1 ring-purple-200 dark:ring-purple-800'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {teamName}
                </Badge>
                <OkrStatusBadge status={objective.status} type="objective" />
                {objective.is_shared && (
                  <SharedOkrBadge
                    isShared
                    primaryTeamName={teamName}
                    contributingTeams={contributingTeams}
                    responsibilityModel={objective.responsibility_model as 'collaborative' | 'primary_led'}
                    isPrimaryTeam={isPrimaryTeam}
                    compact
                  />
                )}
              </div>
              <CardTitle className="text-lg font-semibold line-clamp-2">
                {objective.title}
              </CardTitle>
              {objective.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {objective.description}
                </p>
              )}
              {/* Show contributing teams for shared OKRs */}
              {objective.is_shared && contributingTeams.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Times: {teamName}, {contributingTeams.map(t => t.name).join(', ')}
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
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  {vicEnabled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          openPanel({
                            agentSlug: "validador-metodologico-okrs",
                            actionContext: "okr-review-quality",
                            context: {
                              type: "Objetivo de Time",
                              title: objective.title,
                              description: objective.description || undefined,
                              status: objective.status,
                              additionalData: {
                                teamName,
                                isShared: objective.is_shared,
                                contributingTeams: contributingTeams.map(t => t.name),
                                krsCount: objectiveKrs.length,
                                krs: objectiveKrs.map(kr => ({
                                  title: kr.title,
                                  baseline: kr.baseline,
                                  current: kr.current_value,
                                  target: kr.target,
                                  status: kr.status,
                                })),
                              },
                            },
                          });
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Vic: Revisar qualidade
                      </DropdownMenuItem>
                    </>
                  )}
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
                  redCount > 0 && 'bg-danger',
                  redCount === 0 && yellowCount > 0 && 'bg-warning',
                  redCount === 0 && yellowCount === 0 && 'bg-success'
                )}
                style={{ width: `${avgProgress}%` }}
              />
            </div>

            {/* KR summary */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-xs">
                {greenCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    {greenCount}
                  </span>
                )}
                {yellowCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    {yellowCount}
                  </span>
                )}
                {redCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-danger" />
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
                      <div className="flex items-center gap-1">
                        <KrActionButtons
                          kr={{
                            ...kr,
                            direction: kr.direction as 'up' | 'down',
                            status: kr.status as 'green' | 'yellow' | 'red' | 'not_started',
                          }}
                          onEdit={() => setEditingKr({
                            id: kr.id,
                            team_id: kr.team_id,
                            team_objective_id: kr.team_objective_id,
                            title: kr.title,
                            type: kr.type as OkrKrType,
                            baseline: kr.baseline,
                            current_value: kr.current_value,
                            target: kr.target,
                            direction: kr.direction as OkrDirection,
                            unit: kr.unit,
                            status: kr.status as OkrRagStatus,
                            owner_user_id: kr.owner_user_id,
                          })}
                          onCheckin={() => setCheckinKr({
                            id: kr.id,
                            title: kr.title,
                            baseline: kr.baseline,
                            current_value: kr.current_value,
                            target: kr.target,
                            direction: kr.direction as 'up' | 'down',
                            unit: kr.unit,
                            status: kr.status as 'green' | 'yellow' | 'red' | 'not_started',
                            team_id: kr.team_id,
                          })}
                        />
                      </div>
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

      <TeamKrFormDialog
        open={showAddKrDialog}
        onOpenChange={setShowAddKrDialog}
        objectiveId={objective.id}
        teamId={objective.team_id}
        buId={objective.bu_id || undefined}
      />

      <TeamObjectiveFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        teams={[]}
        orgObjectives={[]}
        objective={objective}
      />

      {checkinKr && (
        <CheckinDialog
          open={!!checkinKr}
          onOpenChange={(open) => !open && setCheckinKr(null)}
          kr={checkinKr}
        />
      )}

      {editingKr && (
        <TeamKrFormDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          objectiveId={objective.id}
          teamId={objective.team_id}
          kr={editingKr}
        />
      )}
    </>
  );
}
