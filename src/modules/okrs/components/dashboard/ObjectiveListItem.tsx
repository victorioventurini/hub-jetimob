import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, ChevronDown, User, Plus, MoreHorizontal, Pencil, RefreshCw, Target, Users, Lightbulb, Heart } from 'lucide-react';
import { InitiativesList } from '../initiatives';
import { cn } from '@/lib/utils';
import { calculateProgress, OkrDirection, OkrRagStatus, OkrKrType, OkrStatus } from '../../types';
import { STATUS_CONFIG, mapRagToCalculated } from '../../hooks/useOkrStatus';
import { CreateOrgKrDialog } from '../CreateOrgKrDialog';
import { CreateTeamKrDialog } from '../CreateTeamKrDialog';
import { EditOrgKrDialog } from '../EditOrgKrDialog';
import { EditTeamKrDialog } from '../EditTeamKrDialog';
import { EditOrgObjectiveDialog } from '../EditOrgObjectiveDialog';
import { EditTeamObjectiveDialog } from '../EditTeamObjectiveDialog';
import { CheckinDialog } from '../CheckinDialog';
import { SharedOkrBadge } from '../SharedOkrBadge';
import { OkrScopeBadge, OkrOwnerInfo, RagSummary, OkrKrTypeBadge } from '../ui';

interface KeyResult {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: OkrDirection;
  status: OkrRagStatus;
  updated_at: string;
  type?: OkrKrType;
  team_id?: string;
  team_objective_id?: string | null;
  org_objective_id?: string;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  } | null;
}

interface Objective {
  id: string;
  title: string;
  description?: string | null;
  year?: number;
  status: string;
  team_id?: string;
  bu_id?: string;
  org_objective_id?: string;
  is_shared?: boolean;
  responsibility_model?: string | null;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  } | null;
  key_results?: KeyResult[];
  contributors?: Array<{
    id: string;
    team_id: string;
    team?: { id: string; name: string };
  }>;
}

interface ObjectiveListItemProps {
  objective: Objective;
  keyResults?: KeyResult[];
  isLoading?: boolean;
  type: 'org' | 'team';
  teamName?: string;
}

export function ObjectiveListItem({ 
  objective, 
  keyResults = [], 
  isLoading, 
  type,
  teamName 
}: ObjectiveListItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const [showEditObjectiveDialog, setShowEditObjectiveDialog] = useState(false);
  const [editingKr, setEditingKr] = useState<KeyResult | null>(null);
  const [checkinKr, setCheckinKr] = useState<KeyResult | null>(null);

  const { progress, status, krCount } = useMemo(() => {
    if (!keyResults || keyResults.length === 0) {
      return { progress: 0, status: 'not_started' as const, krCount: 0 };
    }

    const totalProgress = keyResults.reduce((acc, kr) => {
      return acc + calculateProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || 'up'
      );
    }, 0);

    const avgProgress = totalProgress / keyResults.length;
    
    // Determine overall status based on KR statuses
    const redCount = keyResults.filter(kr => kr.status === 'red').length;
    const yellowCount = keyResults.filter(kr => kr.status === 'yellow').length;
    
    let overallStatus: 'on_track' | 'at_risk' | 'off_track' | 'not_started' = 'on_track';
    if (redCount > 0) {
      overallStatus = 'off_track';
    } else if (yellowCount > 0) {
      overallStatus = 'at_risk';
    }
    
    if (avgProgress >= 100) {
      overallStatus = 'on_track';
    }

    return { 
      progress: avgProgress, 
      status: overallStatus,
      krCount: keyResults.length
    };
  }, [keyResults]);

  const statusConfig = STATUS_CONFIG[status];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "transition-all duration-200",
        isExpanded && "ring-1 ring-border shadow-md"
      )}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <ChevronRight className={cn(
                  "w-4 h-4 mt-1 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <OkrScopeBadge 
                          scope={type === 'org' ? 'org' : 'team'} 
                          teamName={teamName}
                        />
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium", statusConfig.color, statusConfig.borderColor)}
                        >
                          {statusConfig.label}
                        </Badge>
                        {/* Health indicator based on KR status */}
                        {krCount > 0 && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs',
                              status === 'on_track' && 'bg-green-500/10 text-green-600 border-green-200',
                              status === 'at_risk' && 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
                              status === 'off_track' && 'bg-red-500/10 text-red-600 border-red-200',
                            )}
                          >
                            <Heart className="w-3 h-3 mr-1" />
                            {Math.round(progress)}%
                          </Badge>
                        )}
                        {type === 'team' && objective.is_shared && (
                          <SharedOkrBadge
                            isShared
                            primaryTeamName={teamName}
                            contributingTeams={objective.contributors?.map(c => ({
                              id: c.team_id,
                              name: c.team?.name || 'Time',
                            })) || []}
                            responsibilityModel={objective.responsibility_model as 'collaborative' | 'primary_led'}
                            compact
                          />
                        )}
                      </div>
                      <h3 className="font-medium leading-snug line-clamp-2">
                        {objective.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        {objective.year && (
                          <span className="text-xs text-muted-foreground">{objective.year}</span>
                        )}
                        <RagSummary
                          green={keyResults.filter(kr => kr.status === 'green').length}
                          yellow={keyResults.filter(kr => kr.status === 'yellow').length}
                          red={keyResults.filter(kr => kr.status === 'red').length}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium", statusConfig.color, statusConfig.borderColor)}
                      >
                        {statusConfig.label}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setShowEditObjectiveDialog(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar Objetivo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setShowAddKrDialog(true);
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar KR
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <OkrOwnerInfo owner={objective.owner} size="md" />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="border-t bg-muted/20">
              {keyResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum Key Result definido ainda
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {keyResults.map((kr) => (
                    <KeyResultRow 
                      key={kr.id} 
                      kr={kr} 
                      type={type}
                      objectiveTitle={objective.title}
                      teamName={teamName}
                      onEdit={() => setEditingKr(kr)}
                      onCheckin={() => setCheckinKr(kr)}
                    />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Create KR Dialogs */}
      {type === 'org' && (
        <CreateOrgKrDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
        />
      )}
      {type === 'team' && (
        <CreateTeamKrDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
          teamId={objective.team_id || ''}
          buId={objective.bu_id}
        />
      )}

      {/* Edit Objective Dialogs */}
      {type === 'org' && objective.year ? (
        <EditOrgObjectiveDialog
          open={showEditObjectiveDialog}
          onOpenChange={setShowEditObjectiveDialog}
          objective={{
            id: objective.id,
            title: objective.title,
            description: objective.description,
            year: objective.year,
            status: objective.status as OkrStatus,
          }}
        />
      ) : type === 'team' && objective.team_id ? (
        <EditTeamObjectiveDialog
          open={showEditObjectiveDialog}
          onOpenChange={setShowEditObjectiveDialog}
          objective={{
            id: objective.id,
            title: objective.title,
            description: objective.description,
            team_id: objective.team_id,
            status: objective.status as OkrStatus,
          }}
        />
      ) : null}

      {/* Edit KR Dialogs */}
      {editingKr && type === 'org' && (
        <EditOrgKrDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          kr={{
            id: editingKr.id,
            org_objective_id: editingKr.org_objective_id || objective.id,
            title: editingKr.title,
            baseline: editingKr.baseline,
            current_value: editingKr.current_value,
            target: editingKr.target,
            direction: editingKr.direction,
            unit: editingKr.unit,
            status: editingKr.status,
          }}
        />
      )}
      
      {editingKr && type === 'team' && editingKr.team_id && (
        <EditTeamKrDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          kr={{
            id: editingKr.id,
            team_id: editingKr.team_id,
            team_objective_id: editingKr.team_objective_id,
            title: editingKr.title,
            type: editingKr.type || 'contribution',
            baseline: editingKr.baseline,
            current_value: editingKr.current_value,
            target: editingKr.target,
            direction: editingKr.direction,
            unit: editingKr.unit,
            status: editingKr.status,
          }}
        />
      )}

      {/* Checkin Dialog (only for team KRs) */}
      {checkinKr && type === 'team' && checkinKr.team_id && (
        <CheckinDialog
          open={!!checkinKr}
          onOpenChange={(open) => !open && setCheckinKr(null)}
          kr={{
            id: checkinKr.id,
            title: checkinKr.title,
            baseline: checkinKr.baseline,
            current_value: checkinKr.current_value,
            target: checkinKr.target,
            direction: checkinKr.direction,
            unit: checkinKr.unit,
            status: checkinKr.status,
            team_id: checkinKr.team_id,
          }}
        />
      )}
    </>
  );
}

interface KeyResultRowProps {
  kr: KeyResult;
  type: 'org' | 'team';
  objectiveTitle?: string;
  teamName?: string;
  onEdit: () => void;
  onCheckin: () => void;
}

function KeyResultRow({ kr, type, objectiveTitle, teamName, onEdit, onCheckin }: KeyResultRowProps) {
  const [showInitiatives, setShowInitiatives] = useState(false);
  
  const progress = calculateProgress(
    Number(kr.baseline) || 0,
    Number(kr.current_value) || 0,
    Number(kr.target) || 0,
    kr.direction || 'up'
  );
  
  const calculatedStatus = mapRagToCalculated(kr.status);
  const statusConfig = STATUS_CONFIG[calculatedStatus];

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value}%`;
    if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (unit === '$') return `$ ${value.toLocaleString('en-US')}`;
    return `${value} ${unit}`;
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="px-4 py-3 pl-11 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{kr.title}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("font-medium", statusConfig.color)}>
                {statusConfig.label}
              </span>
              <span>•</span>
              <span>
                {formatValue(kr.current_value, kr.unit)} / {formatValue(kr.target, kr.unit)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 w-24">
              <Progress 
                value={progress} 
                className="h-1.5 flex-1" 
              />
              <span className="text-xs font-medium w-8 text-right">
                {progress.toFixed(0)}%
              </span>
            </div>
            
            {type === 'team' && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6", showInitiatives && "bg-muted")}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInitiatives(!showInitiatives);
                }}
                title="Ver iniciativas"
              >
                <Lightbulb className="w-3 h-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Editar KR"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            
            {type === 'team' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckin();
                }}
                title="Check-in"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            
            {kr.owner ? (
              <Avatar className="w-5 h-5">
                <AvatarImage src={kr.owner.photo_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {kr.owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Initiatives section */}
      {type === 'team' && showInitiatives && (
        <div className="pl-11 pr-4 pb-4 bg-muted/20">
          <InitiativesList 
            krId={kr.id} 
            krTitle={kr.title} 
            krContext={{
              id: kr.id,
              title: kr.title,
              objectiveTitle,
              teamName,
            }}
            canEdit 
          />
        </div>
      )}
    </div>
  );
}
