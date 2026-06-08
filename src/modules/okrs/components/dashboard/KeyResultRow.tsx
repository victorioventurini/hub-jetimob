import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, User, Pencil, RefreshCw, Lightbulb, History } from 'lucide-react';
import { InitiativesList } from '../initiatives';
import { ProjectsForKrSection } from '@/modules/projects/components/ProjectsForKrSection';
import { useKrInitiativesCount } from '../../hooks/useInitiatives';
import { useProfileId } from '@/hooks/useIdentity';
import { cn } from '@/lib/utils';
import { calculateProgress, OkrDirection, OkrRagStatus, OkrKrType } from '../../types';
import { STATUS_CONFIG, mapRagToCalculated } from '../../hooks/useOkrStatus';
import { getEffectiveKrRagStatus } from '../../utils/effectiveStatus';
import { KrPrimaryKpiBadge } from '../ui';

/**
 * KeyResult — tipo canônico consumido por toda linha-resumo de KR
 * (Team KRs próprias e KRs contribuidoras em OKRs compartilhadas).
 */
export interface KeyResult {
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

export interface KeyResultRowProps {
  kr: KeyResult;
  type: 'org' | 'team';
  objectiveTitle?: string;
  objectiveStatus?: string;
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
  primaryKpiInfo?: {
    kpiId: string;
    kpiName: string;
    kpiUnit?: string;
    direction: 'up' | 'down' | 'maintain';
    currentValue: number | null;
    targetValue: number | null;
    ragStatus: 'green' | 'yellow' | 'red' | 'no_data';
  };
  onEdit: () => void;
  onCheckin: () => void;
  onShowHistory: () => void;
}

/**
 * KeyResultRow — Componente canônico de linha-resumo de KR.
 *
 * Padrão único usado tanto por `ObjectiveListItem` (Team/Org KRs próprias)
 * quanto por `ContributingOkrCard` (KRs contribuidoras em OKRs compartilhadas).
 *
 * Não reimplementar localmente — importar daqui.
 */
export const KeyResultRow = React.memo(function KeyResultRow({
  kr,
  type,
  objectiveTitle,
  objectiveStatus,
  teamName,
  canEdit = false,
  canCheckin = false,
  filterInitiativesForUser,
  defaultInitiativesExpanded = false,
  hasPrimaryKpi = false,
  primaryKpiInfo,
  onEdit,
  onCheckin,
  onShowHistory,
}: KeyResultRowProps) {
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

  const effectiveCurrent = hasPrimaryKpi && primaryKpiInfo?.currentValue !== null && primaryKpiInfo?.currentValue !== undefined
    ? primaryKpiInfo.currentValue
    : Number(kr.current_value) || 0;

  const effectiveTarget = hasPrimaryKpi && primaryKpiInfo?.targetValue !== null && primaryKpiInfo?.targetValue !== undefined
    ? primaryKpiInfo.targetValue
    : Number(kr.target) || 0;

  const effectiveStatus = hasPrimaryKpi && primaryKpiInfo?.ragStatus && primaryKpiInfo.ragStatus !== 'no_data'
    ? primaryKpiInfo.ragStatus
    : getEffectiveKrRagStatus(kr.status, Number(kr.baseline) || 0, Number(kr.current_value) || 0);

  // KPI primário é a fonte única de verdade: unidade segue a do KPI quando vinculado
  const effectiveUnit = hasPrimaryKpi && primaryKpiInfo?.kpiUnit
    ? primaryKpiInfo.kpiUnit
    : kr.unit;

  const progress = calculateProgress(
    Number(kr.baseline) || 0,
    effectiveCurrent,
    effectiveTarget,
    kr.direction || 'up',
    { unit: effectiveUnit }
  );

  const calculatedStatus = mapRagToCalculated(effectiveStatus);
  const safeCalculatedStatus = STATUS_CONFIG[calculatedStatus] ? calculatedStatus : 'not_started';
  const statusConfig = STATUS_CONFIG[safeCalculatedStatus];

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
                  <p className="text-sm font-medium line-clamp-2 sm:truncate" title={kr.title}>{kr.title}</p>
                  {objectiveStatus === 'draft' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-status-gray-muted text-status-gray-muted-foreground border-status-gray/20 shrink-0">
                      Rascunho
                    </Badge>
                  )}
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
                    {formatValue(effectiveCurrent, effectiveUnit)} / {formatValue(effectiveTarget, effectiveUnit)}
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

                  {canDoCheckin && (
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
        <div className="px-4 sm:px-6 pb-4 pt-2 bg-muted/10 space-y-4">
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
            isDraft={objectiveStatus === 'draft'}
          />
          <ProjectsForKrSection
            krId={kr.id}
            krKind="team"
            canEdit={canDoEdit || canDoCheckin}
          />
        </div>
      )}
    </div>
  );
});
