import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Pencil, 
  Plus, 
  RefreshCw, 
  Lightbulb,
  Target,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OkrScopeBadge, 
  OkrOwnerInfo, 
  OkrHealthIndicator, 
  RagSummary,
  OkrContributionLink,
  OkrKrTypeBadge,
  OkrCycleProgress,
  KrPrimaryKpiBadge,
} from './ui';
import { OkrStatusBadge } from './OkrStatusBadge';
import { SharedOkrBadge } from './SharedOkrBadge';
import type { OkrStatus, OkrRagStatus, OkrDirection, OkrKrType } from '../types';
import { calculateProgress } from '../types';
import { useKrPrimaryKpiBatch } from '../hooks';

interface Owner {
  display_name: string;
  photo_url?: string | null;
  role?: string;
}

interface KeyResult {
  id: string;
  title: string;
  type?: OkrKrType;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  owner?: Owner | null;
  linked_org_kr_id?: string | null;
  linked_org_kr_title?: string;
}

interface Contributor {
  id: string;
  team_id: string;
  team?: { id: string; name: string };
}

interface Cycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface EnhancedObjectiveCardProps {
  id: string;
  title: string;
  description?: string | null;
  type: 'org' | 'team';
  status: OkrStatus;
  year?: number;
  teamName?: string;
  teamHierarchy?: string[];
  owner?: Owner | null;
  keyResults: KeyResult[];
  cycle?: Cycle | null;
  isShared?: boolean;
  responsibilityModel?: 'collaborative' | 'primary_led' | null;
  contributors?: Contributor[];
  healthScore?: number;
  healthSummary?: string;
  linkedOrgObjectiveTitle?: string;
  linkedOrgObjectiveId?: string;
  onEdit?: () => void;
  onAddKr?: () => void;
  onKrEdit?: (kr: KeyResult) => void;
  onKrCheckin?: (kr: KeyResult) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export const EnhancedObjectiveCard = React.memo(function EnhancedObjectiveCard({
  id,
  title,
  description,
  type,
  status,
  year,
  teamName,
  teamHierarchy,
  owner,
  keyResults,
  cycle,
  isShared,
  responsibilityModel,
  contributors,
  healthScore,
  healthSummary,
  linkedOrgObjectiveTitle,
  linkedOrgObjectiveId,
  onEdit,
  onAddKr,
  onKrEdit,
  onKrCheckin,
  defaultExpanded = false,
  className,
}: EnhancedObjectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // v3.4.2: Batch fetch primary KPIs for all KRs in this objective
  const krIds = useMemo(() => keyResults.map(kr => kr.id), [keyResults]);
  const { hasKrPrimaryKpi, getKrPrimaryKpi } = useKrPrimaryKpiBatch(krIds, type);
  const { avgProgress, greenCount, yellowCount, redCount, notStartedCount } = useMemo(() => {
    if (keyResults.length === 0) {
      return { avgProgress: 0, greenCount: 0, yellowCount: 0, redCount: 0, notStartedCount: 0 };
    }

    const total = keyResults.reduce((acc, kr) => {
      return acc + calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction);
    }, 0);

    return {
      avgProgress: total / keyResults.length,
      greenCount: keyResults.filter(kr => kr.status === 'green').length,
      yellowCount: keyResults.filter(kr => kr.status === 'yellow').length,
      redCount: keyResults.filter(kr => kr.status === 'red').length,
      notStartedCount: keyResults.filter(kr => kr.status === 'not_started').length,
    };
  }, [keyResults]);

  // Determine border color based on worst KR status
  const getBorderColor = () => {
    if (redCount > 0) return 'border-l-danger';
    if (yellowCount > 0) return 'border-l-warning';
    if (greenCount > 0) return 'border-l-success';
    return 'border-l-muted';
  };

  // Contributing teams for shared OKRs
  const contributingTeams = contributors?.map(c => ({
    id: c.team_id,
    name: c.team?.name || 'Time',
  })) || [];

  return (
    <Card className={cn(
      'transition-all border-l-4',
      getBorderColor(),
      isShared && 'ring-1 ring-purple-200 dark:ring-purple-800',
      isExpanded && 'shadow-md',
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              {/* Expand indicator */}
              <ChevronRight className={cn(
                "w-4 h-4 mt-1 text-muted-foreground transition-transform duration-200 shrink-0",
                isExpanded && "rotate-90"
              )} />

              <div className="flex-1 min-w-0">
                {/* Row 1: Badges - Scope, Status, Health, Shared */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <OkrScopeBadge 
                    scope={type === 'org' ? 'org' : 'team'} 
                    teamName={teamName}
                  />
                  <OkrStatusBadge status={status} type="objective" />
                  
                  {healthScore !== undefined && (
                    <OkrHealthIndicator 
                      score={healthScore} 
                      summary={healthSummary}
                      variant="pill"
                    />
                  )}
                  
                  {isShared && (
                    <SharedOkrBadge
                      isShared
                      primaryTeamName={teamName}
                      contributingTeams={contributingTeams}
                      responsibilityModel={responsibilityModel}
                      compact
                    />
                  )}

                  {cycle && (
                    <OkrCycleProgress
                      startDate={cycle.start_date}
                      endDate={cycle.end_date}
                      currentProgress={avgProgress}
                      cycleName={cycle.name}
                    />
                  )}
                </div>

                {/* Row 2: Title */}
                <h3 className="font-semibold text-lg leading-snug line-clamp-2">
                  {title}
                </h3>

                {/* Row 3: Description (if exists) */}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {description}
                  </p>
                )}

                {/* Row 4: Contribution link (for team objectives) */}
                {type === 'team' && linkedOrgObjectiveTitle && (
                  <div className="mt-2">
                    <OkrContributionLink
                      type="contributes_to"
                      targetTitle={linkedOrgObjectiveTitle}
                      targetType="org_objective"
                      targetId={linkedOrgObjectiveId}
                    />
                  </div>
                )}

                {/* Row 5: Meta info - Year, KR count, Owner */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {year && <span>{year}</span>}
                    <RagSummary 
                      green={greenCount} 
                      yellow={yellowCount} 
                      red={redCount}
                      notStarted={notStartedCount}
                    />
                  </div>
                  
                  <OkrOwnerInfo owner={owner} size="md" />
                </div>

                {/* Row 6: Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={avgProgress} className="h-2 flex-1" />
                  <span className="text-sm font-medium w-12 text-right">
                    {avgProgress.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar Objetivo
                      </DropdownMenuItem>
                    )}
                    {onAddKr && (
                      <DropdownMenuItem onClick={onAddKr}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar KR
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t bg-muted/20">
            {keyResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum Key Result definido ainda
                {onAddKr && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="ml-2"
                    onClick={onAddKr}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {keyResults.map((kr, index) => {
                  const kpiInfo = getKrPrimaryKpi(kr.id);
                  return (
                    <EnhancedKrRow
                      key={kr.id}
                      kr={kr}
                      index={index}
                      type={type}
                      hasPrimaryKpi={hasKrPrimaryKpi(kr.id)}
                      primaryKpiInfo={kpiInfo}
                      onEdit={onKrEdit ? () => onKrEdit(kr) : undefined}
                      onCheckin={onKrCheckin ? () => onKrCheckin(kr) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

interface EnhancedKrRowProps {
  kr: KeyResult;
  index: number;
  type: 'org' | 'team';
  /** v3.4.2: Se a KR tem KPI primária vinculada */
  hasPrimaryKpi?: boolean;
  /** v3.4.2: Dados da KPI primária */
  primaryKpiInfo?: { kpiId: string; kpiName: string; direction: 'up' | 'down' | 'maintain' };
  onEdit?: () => void;
  onCheckin?: () => void;
}

function EnhancedKrRow({ kr, index, type, hasPrimaryKpi, primaryKpiInfo, onEdit, onCheckin }: EnhancedKrRowProps) {
  const progress = calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction);

  const formatValue = (value: number | null | undefined, unit: string) => {
    if (value === null || value === undefined) return '—';
    if (unit === '%') return `${value}%`;
    if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (unit === '$') return `$ ${value.toLocaleString('en-US')}`;
    return `${value.toLocaleString('pt-BR')} ${unit}`;
  };

  const getStatusColor = () => {
    switch (kr.status) {
      case 'green': return 'text-success';
      case 'yellow': return 'text-warning';
      case 'red': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="py-3 px-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Index */}
        <span className="text-xs font-medium text-muted-foreground w-4 pt-0.5 shrink-0">
          {index + 1}.
        </span>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row with type badge and status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{kr.title}</p>
                {kr.type && <OkrKrTypeBadge type={kr.type} />}
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
              
              {/* Contribution link for team KRs */}
              {kr.linked_org_kr_title && (
                <div className="mt-1">
                  <OkrContributionLink
                    type="linked_to"
                    targetTitle={kr.linked_org_kr_title}
                    targetType="org_kr"
                    compact
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Owner */}
              <OkrOwnerInfo owner={kr.owner} size="sm" />
              
              {/* Edit button */}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  title="Editar KR"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
              
              {/* Botão de Check-in (apenas KRs de time) */}
              {type === 'team' && onCheckin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onCheckin(); }}
                  title="Atualizar progresso"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress row */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {formatValue(kr.current_value, kr.unit)} / {formatValue(kr.target, kr.unit)}
                </span>
                <span className={cn('font-medium', getStatusColor(), progress > 100 && 'text-status-green')}>
                  {progress.toFixed(0)}%
                  {progress > 100 && ' 🚀'}
                </span>
              </div>
              {/* Barra visual limitada a 100% */}
              <Progress value={Math.min(100, progress)} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
