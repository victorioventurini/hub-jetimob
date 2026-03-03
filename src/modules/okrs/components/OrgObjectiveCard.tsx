import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Target, Plus, MoreHorizontal, Pencil, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from './OkrStatusBadge';
import { OkrProgressBar } from './OkrProgressBar';
import { useOrgKeyResults, useCanManageOrgOkr } from '../hooks';
import { useBu } from '@/contexts/BuContext';
import { OrgKrFormDialog } from './OrgKrFormDialog';
import { OrgObjectiveFormDialog } from './OrgObjectiveFormDialog';
import type { OkrStatus, OkrRagStatus, OkrDirection } from '../types';
import { getEffectiveKrRagStatus } from '../utils/effectiveStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrgObjectiveCardProps {
  objective: {
    id: string;
    title: string;
    description?: string | null;
    year: number;
    status: OkrStatus;
    owner_user_id?: string | null;
    bu_id?: string | null;
  };
}

export function OrgObjectiveCard({ objective }: OrgObjectiveCardProps) {
  const { currentBu } = useBu();
  const [expanded, setExpanded] = useState(false);
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingKr, setEditingKr] = useState<{
    id: string;
    org_objective_id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    direction: OkrDirection;
    unit: string;
    status: OkrRagStatus;
    owner_user_id?: string | null;
  } | null>(null);
  const { data: keyResults, isLoading } = useOrgKeyResults(objective.bu_id || currentBu?.id, objective.id);
  
  // Permission check: Can user manage org OKRs?
  const { canManage: canEditOrgOkr } = useCanManageOrgOkr();

  const activeKrs = keyResults?.filter(kr => !kr.deleted_at) || [];
  
  // Calculate average progress
  const avgProgress = activeKrs.length > 0
    ? activeKrs.reduce((acc, kr) => {
        const direction = kr.direction as 'up' | 'down';
        if (direction === 'up') {
          if (kr.target === kr.baseline) return acc + (kr.current_value >= kr.target ? 100 : 0);
          return acc + Math.max(0, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100);
        } else {
          if (kr.baseline === kr.target) return acc + (kr.current_value <= kr.target ? 100 : 0);
          return acc + Math.max(0, ((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100);
        }
      }, 0) / activeKrs.length
    : 0;

  // Count KR statuses
  const greenCount = activeKrs.filter(kr => kr.status === 'green').length;
  const yellowCount = activeKrs.filter(kr => kr.status === 'yellow').length;
  const redCount = activeKrs.filter(kr => kr.status === 'red').length;

  return (
    <>
      <Card className={cn(
        'group transition-all border-l-4',
        redCount > 0 && 'border-l-danger',
        redCount === 0 && yellowCount > 0 && 'border-l-warning',
        redCount === 0 && yellowCount === 0 && greenCount > 0 && 'border-l-success',
        activeKrs.length === 0 && 'border-l-muted'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Organizacional
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
              {canEditOrgOkr && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
              <span className={cn("font-semibold", avgProgress > 100 && "text-status-green")}>{avgProgress.toFixed(0)}%{avgProgress > 100 && ' 🚀'}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  redCount > 0 && 'bg-danger',
                  redCount === 0 && yellowCount > 0 && 'bg-warning',
                  redCount === 0 && yellowCount === 0 && 'bg-success'
                )}
                style={{ width: `${Math.min(100, avgProgress)}%` }}
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
                  {activeKrs.length} KR{activeKrs.length !== 1 ? 's' : ''}
                </span>
              </div>
              {canEditOrgOkr && (
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
              )}
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
              ) : activeKrs.length > 0 ? (
                activeKrs.map((kr, index) => (
                  <div
                    key={kr.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setEditingKr({
                      id: kr.id,
                      org_objective_id: kr.org_objective_id,
                      title: kr.title,
                      baseline: kr.baseline,
                      current_value: kr.current_value,
                      target: kr.target,
                      direction: kr.direction as OkrDirection,
                      unit: kr.unit,
                      status: kr.status as OkrRagStatus,
                      owner_user_id: kr.owner_user_id,
                    })}
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
                      <div className="flex items-center gap-2">
                        {/* Owner Avatar */}
                        {kr.owner ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={kr.owner.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {kr.owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingKr({
                              id: kr.id,
                              org_objective_id: kr.org_objective_id,
                              title: kr.title,
                              baseline: kr.baseline,
                              current_value: kr.current_value,
                              target: kr.target,
                              direction: kr.direction as OkrDirection,
                              unit: kr.unit,
                              status: kr.status as OkrRagStatus,
                              owner_user_id: kr.owner_user_id,
                            });
                          }}
                          title="Editar KR"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <OkrStatusBadge status={getEffectiveKrRagStatus(kr.status as OkrRagStatus, kr.baseline, kr.current_value)} type="kr" />
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

      <OrgKrFormDialog
        open={showAddKrDialog}
        onOpenChange={setShowAddKrDialog}
        objectiveId={objective.id}
      />

      <OrgObjectiveFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        year={objective.year}
        objective={objective}
      />

      {editingKr && (
        <OrgKrFormDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          objectiveId={objective.id}
          kr={editingKr}
        />
      )}
    </>
  );
}
