import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ChevronRight, ChevronDown, User, Plus, MoreHorizontal, Pencil, RefreshCw, Target, Users, Lightbulb, Heart, History, Wand2 } from 'lucide-react';
import { InitiativesList } from '../initiatives';
import { useKrInitiativesCount } from '../../hooks/useInitiatives';
import { useProfileId } from '@/hooks/useIdentity';
import { cn } from '@/lib/utils';
import { calculateProgress, OkrDirection, OkrRagStatus, OkrKrType, OkrStatus } from '../../types';
import { STATUS_CONFIG, mapRagToCalculated } from '../../hooks/useOkrStatus';
import { OrgKrFormDialog } from '../OrgKrFormDialog';
import { TeamKrFormDialog } from '../TeamKrFormDialog';
import { OrgObjectiveFormDialog } from '../OrgObjectiveFormDialog';
import { TeamObjectiveFormDialog } from '../TeamObjectiveFormDialog';
import { CheckinDialog } from '../CheckinDialog';
import { SharedOkrBadge } from '../SharedOkrBadge';
import { OkrScopeBadge, OkrOwnerInfo, RagSummary, OkrKrTypeBadge, KrPrimaryKpiBadge } from '../ui';
import { KrHistoryDialog } from '../KrHistoryDialog';
import { useKrPrimaryKpiBatch } from '../../hooks';

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
  /** ID do profile do responsável pela KR */
  owner_user_id?: string;
  owner?: {
    id?: string;
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
  /** Se o usuário pode editar este objetivo (via useCanManageTeamOkr ou useCanManageOrgOkr) */
  canEdit?: boolean;
  /** Se o usuário pode fazer check-in nas KRs (responsável mesmo sem ser líder) */
  canCheckin?: boolean;
  /** Se presente, filtra iniciativas apenas deste usuário (profile.id) */
  filterInitiativesForUser?: string;
}

export const ObjectiveListItem = React.memo(function ObjectiveListItem({ 
  objective, 
  keyResults = [], 
  isLoading, 
  type,
  teamName,
  canEdit = false,
  canCheckin = false,
  filterInitiativesForUser,
}: ObjectiveListItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const [showEditObjectiveDialog, setShowEditObjectiveDialog] = useState(false);
  const [editingKr, setEditingKr] = useState<KeyResult | null>(null);
  const [checkinKr, setCheckinKr] = useState<KeyResult | null>(null);
  const [historyKr, setHistoryKr] = useState<KeyResult | null>(null);

  // v3.4.2: Batch fetch primary KPIs for all KRs in this objective
  const krIds = useMemo(() => keyResults.map(kr => kr.id), [keyResults]);
  const { hasKrPrimaryKpi, getKrPrimaryKpi } = useKrPrimaryKpiBatch(krIds, type);

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
            <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-2 sm:gap-3">
                <ChevronRight className={cn(
                  "w-4 h-4 mt-0.5 sm:mt-1 text-muted-foreground transition-transform duration-200 shrink-0",
                  isExpanded && "rotate-90"
                )} />
                
                <div className="flex-1 min-w-0">
                  {/* Mobile: Stack layout / Desktop: Side by side */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Badges - scrollable on mobile */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-1 overflow-x-auto pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
                        <OkrScopeBadge 
                          scope={type === 'org' ? 'org' : 'team'} 
                          teamName={teamName}
                        />
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] sm:text-xs font-medium shrink-0", statusConfig.color, statusConfig.borderColor)}
                        >
                          {statusConfig.label}
                        </Badge>
                        {/* Health indicator based on KR status */}
                        {krCount > 0 && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-[10px] sm:text-xs shrink-0',
                              status === 'on_track' && 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
                              status === 'at_risk' && 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/20',
                              status === 'off_track' && 'bg-status-red-muted text-status-red-muted-foreground border-status-red/20',
                            )}
                          >
                            <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
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
                      
                      {/* Title */}
                      <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2">
                        {objective.title}
                      </h3>
                      
                      {/* Year and RAG summary */}
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5">
                        {objective.year && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{objective.year}</span>
                        )}
                        <RagSummary
                          green={keyResults.filter(kr => kr.status === 'green').length}
                          yellow={keyResults.filter(kr => kr.status === 'yellow').length}
                          red={keyResults.filter(kr => kr.status === 'red').length}
                        />
                      </div>
                    </div>
                    
                    {/* Actions and Owner - Row on mobile, side on desktop */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 mt-2 sm:mt-0">
                      {/* Status badge hidden on mobile (already shown above) */}
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium hidden sm:flex", statusConfig.color, statusConfig.borderColor)}
                      >
                        {statusConfig.label}
                      </Badge>
                      
                      {/* Owner - shown first on mobile for context */}
                      <OkrOwnerInfo owner={objective.owner} size="md" />
                      
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
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
                            {type === 'team' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/okrs/objectives/${objective.id}/krs/create`;
                              }}>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Wizard de KRs
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                    {/* Barra visual limitada a 100% */}
                    <Progress value={Math.min(100, progress)} className="h-1.5 sm:h-2 flex-1" />
                    <span className={cn(
                      "text-xs sm:text-sm font-medium w-10 sm:w-12 text-right",
                      progress > 100 && "text-status-green"
                    )}>
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
                <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">
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
                      canEdit={canEdit}
                      canCheckin={canCheckin || canEdit}
                      filterInitiativesForUser={filterInitiativesForUser}
                      defaultInitiativesExpanded={!!filterInitiativesForUser}
                      hasPrimaryKpi={hasKrPrimaryKpi(kr.id)}
                      primaryKpiInfo={getKrPrimaryKpi(kr.id)}
                      onEdit={() => setEditingKr(kr)}
                      onCheckin={() => setCheckinKr(kr)}
                      onShowHistory={() => setHistoryKr(kr)}
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
        <OrgKrFormDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
        />
      )}
      {type === 'team' && (
        <TeamKrFormDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
          teamId={objective.team_id || ''}
          buId={objective.bu_id}
        />
      )}

      {/* Edit Objective Dialogs */}
      {type === 'org' && objective.year ? (
        <OrgObjectiveFormDialog
          open={showEditObjectiveDialog}
          onOpenChange={setShowEditObjectiveDialog}
          year={objective.year}
          objective={{
            id: objective.id,
            title: objective.title,
            description: objective.description,
            year: objective.year,
            status: objective.status as OkrStatus,
          }}
        />
      ) : type === 'team' && objective.team_id ? (
        <TeamObjectiveFormDialog
          open={showEditObjectiveDialog}
          onOpenChange={setShowEditObjectiveDialog}
          teams={[]}
          orgObjectives={[]}
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
        <OrgKrFormDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          objectiveId={objective.id}
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
        <TeamKrFormDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          objectiveId={objective.id}
          teamId={editingKr.team_id}
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
            owner_user_id: editingKr.owner_user_id,
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

      {/* KR History Dialog */}
      {historyKr && (
        <KrHistoryDialog
          open={!!historyKr}
          onOpenChange={(open) => !open && setHistoryKr(null)}
          kr={{
            id: historyKr.id,
            title: historyKr.title,
            baseline: historyKr.baseline,
            current_value: historyKr.current_value,
            target: historyKr.target,
            unit: historyKr.unit,
            direction: historyKr.direction,
            status: historyKr.status,
            type: historyKr.type || 'contribution',
            owner_name: historyKr.owner?.display_name,
            owner_photo: historyKr.owner?.photo_url,
            team_name: teamName,
            objective_title: objective.title,
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
  canEdit?: boolean;
  /** Se o usuário pode fazer check-in (responsável mesmo sem ser líder) */
  canCheckin?: boolean;
  /** Se presente, filtra iniciativas apenas deste usuário */
  filterInitiativesForUser?: string;
  /** Se as iniciativas devem iniciar expandidas */
  defaultInitiativesExpanded?: boolean;
  /** v3.4.2: Se a KR tem KPI primária vinculada */
  hasPrimaryKpi?: boolean;
  /** v3.4.2: Dados da KPI primária */
  primaryKpiInfo?: { kpiId: string; kpiName: string; direction: 'up' | 'down' | 'maintain' };
  onEdit: () => void;
  onCheckin: () => void;
  onShowHistory: () => void;
}

function KeyResultRow({ kr, type, objectiveTitle, teamName, canEdit = false, canCheckin = false, filterInitiativesForUser, defaultInitiativesExpanded = false, hasPrimaryKpi = false, primaryKpiInfo, onEdit, onCheckin, onShowHistory }: KeyResultRowProps) {
  const [showInitiatives, setShowInitiatives] = useState(defaultInitiativesExpanded);
  const { data: initiativesCount = 0 } = useKrInitiativesCount(type === 'team' ? kr.id : undefined);
  const currentProfileId = useProfileId();
  
  // Verifica se o usuário atual é o responsável ou co-responsável pela KR
  const isKrOwnerOrCoResponsible = currentProfileId && (
    kr.owner_user_id === currentProfileId || 
    kr.owner?.id === currentProfileId ||
    (kr as KeyResult & { co_responsibles?: string[] }).co_responsibles?.includes(currentProfileId)
  );
  
  // Pode editar se: já tem permissão via prop OU é o responsável/co-responsável pela KR
  const canDoEdit = canEdit || isKrOwnerOrCoResponsible;
  
  // Pode fazer check-in se: já tem permissão via prop OU é o responsável/co-responsável pela KR
  const canDoCheckin = canCheckin || isKrOwnerOrCoResponsible;
  
  const progress = calculateProgress(
    Number(kr.baseline) || 0,
    Number(kr.current_value) || 0,
    Number(kr.target) || 0,
    kr.direction || 'up'
  );
  
  const calculatedStatus = mapRagToCalculated(kr.status);
  const statusConfig = STATUS_CONFIG[calculatedStatus];

  const formatValue = (value: number | null | undefined, unit: string) => {
    if (value === null || value === undefined) return '—';
    if (unit === '%') return `${value}%`;
    if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (unit === '$') return `$ ${value.toLocaleString('en-US')}`;
    return `${value} ${unit}`;
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div 
        className={cn(
          "px-3 sm:px-4 py-2.5 sm:py-3 pl-5 sm:pl-7 hover:bg-muted/30 transition-colors",
          type === 'team' && "cursor-pointer"
        )}
        onClick={type === 'team' ? () => setShowInitiatives(!showInitiatives) : undefined}
      >
        <div className="flex items-start gap-2">
          {/* Expand chevron for team KRs */}
          {type === 'team' ? (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-muted-foreground transition-transform duration-200 shrink-0",
              showInitiatives && "rotate-90"
            )} />
          ) : (
            <div className="w-3.5 sm:w-4" /> 
          )}
          
          <div className="flex-1 min-w-0">
            {/* Mobile: Stack layout / Desktop: Row layout */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium line-clamp-2 sm:truncate">{kr.title}</p>
                  {/* v3.4.2: Primary KPI indicator badge */}
                  {hasPrimaryKpi && primaryKpiInfo && (
                    <KrPrimaryKpiBadge
                      kpiName={primaryKpiInfo.kpiName}
                      kpiId={primaryKpiInfo.kpiId}
                      direction={primaryKpiInfo.direction}
                      variant="compact"
                      clickable
                    />
                  )}
                </div>
                <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <span className={cn("font-medium", statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    {formatValue(kr.current_value, kr.unit)} / {formatValue(kr.target, kr.unit)}
                  </span>
                  {type === 'team' && initiativesCount > 0 && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-0.5 sm:gap-1 text-primary">
                        <Lightbulb className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {initiativesCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Progress and actions - row on all sizes */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                {/* Progress bar */}
                <div className="flex items-center gap-1.5 sm:gap-2 w-20 sm:w-24">
                  <Progress 
                    value={progress} 
                    className="h-1 sm:h-1.5 flex-1" 
                  />
                  <span className="text-[10px] sm:text-xs font-medium w-7 sm:w-8 text-right">
                    {progress.toFixed(0)}%
                  </span>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-6 sm:w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowHistory();
                    }}
                    title="Ver histórico"
                  >
                    <History className="w-3 h-3" />
                  </Button>
                  
                  {canDoEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-6 sm:w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      title="Editar KR"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {canDoCheckin && type === 'team' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-6 sm:w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckin();
                      }}
                      title="Atualizar progresso"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {kr.owner ? (
                    <Avatar className="w-5 h-5 hidden sm:flex">
                      <AvatarImage src={kr.owner.photo_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {kr.owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted hidden sm:flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Initiatives section - expandable for team KRs */}
      {type === 'team' && showInitiatives && (
        <div className="px-4 sm:px-6 pb-4 pt-2 bg-muted/10">
          <InitiativesList 
            krId={kr.id} 
            krTitle={kr.title} 
            krContext={{
              id: kr.id,
              title: kr.title,
              objectiveTitle,
              teamName,
            }}
            krTeamId={kr.team_id}
            canEdit={canDoEdit || canDoCheckin}
            filterForUserId={filterInitiativesForUser}
          />
        </div>
      )}
    </div>
  );
}
