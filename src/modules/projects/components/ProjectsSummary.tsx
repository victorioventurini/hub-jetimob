/**
 * ProjectsSummary - Resumo de projetos para uso nos wizards
 * 
 * Exibe projetos em andamento de um time com health indicator,
 * progresso de milestones e link externo.
 * 
 * Modos:
 * - checkin: compacto (nome, health, progresso, milestone próximo)
 * - prep: médio (adiciona owner e data)
 * - review: completo (todos os campos + KRs vinculadas)
 * - detail: completo + milestones inline com MilestoneStatusSelect + owner
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink, ChevronDown, ChevronUp, FolderKanban, CalendarDays, StickyNote } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectsForWizard } from '../hooks/useProjectsForWizard';
import { useUpdateMilestone } from '../hooks/useMilestoneMutations';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { MilestoneStatusSelect } from './MilestoneStatusSelect';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectForWizard, MilestoneStatus } from '../types';

type ProjectsSummaryMode = 'checkin' | 'prep' | 'review' | 'detail';

interface ProjectsSummaryProps {
  teamId: string;
  mode: ProjectsSummaryMode;
  onProjectClick?: (projectId: string) => void;
  className?: string;
}

export function ProjectsSummary({ teamId, mode, onProjectClick, className }: ProjectsSummaryProps) {
  const { data: projects, isLoading } = useProjectsForWizard(teamId);
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (!projects || projects.length === 0) return null;

  // Detail mode renders cards directly without collapsible wrapper
  if (mode === 'detail') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 px-1">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Projetos do time</span>
          <Badge variant="outline" className="text-xs">{projects.length}</Badge>
        </div>
        {projects.map((project) => (
          <ProjectDetailItem key={project.id} project={project} />
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 h-auto py-2">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Projetos do time</span>
            <Badge variant="outline" className="text-xs">
              {projects.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-1">
        {projects.map((project) => (
          <ProjectSummaryItem
            key={project.id}
            project={project}
            mode={mode}
            onClick={onProjectClick ? () => onProjectClick(project.id) : undefined}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// ProjectDetailItem — mode="detail" with inline milestones
// ============================================================

function ProjectDetailItem({ project }: { project: ProjectForWizard }) {
  const updateMilestone = useUpdateMilestone();

  const pendingMilestones = useMemo(
    () => (project.milestones || []).filter(m => m.status !== 'done'),
    [project.milestones],
  );

  const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
    updateMilestone.mutate({
      id: milestoneId,
      project_id: project.id,
      status: newStatus,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Project header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{project.name}</h4>
              <ProjectHealthBadge health={project.health} />
              <ProjectStatusBadge status={project.status} />
            </div>
            <ProjectProgressBar
              total={project.milestones_total}
              done={project.milestones_done}
              pct={project.completion_pct}
              showPct
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            {project.due_date && (
              <span className={cn(
                'flex items-center gap-1',
                isPast(parseISO(project.due_date)) && 'text-destructive font-medium',
              )}>
                <CalendarDays className="h-3.5 w-3.5" />
                {format(parseISO(project.due_date), 'dd MMM yyyy', { locale: ptBR })}
              </span>
            )}
            {project.external_url && (
              <a
                href={project.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Link externo"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Pending milestones */}
        {pendingMilestones.length > 0 ? (
          <div className="border-t pt-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Marcos pendentes ({pendingMilestones.length})
            </p>
            {pendingMilestones.map(ms => (
              <div key={ms.id} className="flex items-center gap-2 py-1 min-w-0">
                <MilestoneStatusSelect
                  value={ms.status}
                  onValueChange={(s) => handleStatusChange(ms.id, s)}
                />
                <span className="text-sm truncate flex-1 min-w-0">{ms.name}</span>

                {ms.due_date && (
                  <span className={cn(
                    'text-xs text-muted-foreground shrink-0',
                    isPast(parseISO(ms.due_date)) && ms.status !== 'done' && 'text-destructive',
                  )}>
                    {format(parseISO(ms.due_date), 'dd/MM', { locale: ptBR })}
                  </span>
                )}

                {ms.notes && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs">{ms.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        ) : project.milestones_total === 0 ? (
          <p className="text-xs text-muted-foreground italic border-t pt-2">
            Nenhum marco cadastrado
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic border-t pt-2">
            Todos os marcos concluídos ✓
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ProjectSummaryItem — compact modes (checkin, prep, review)
// ============================================================

function ProjectSummaryItem({
  project,
  mode,
  onClick,
}: {
  project: ProjectForWizard;
  mode: 'checkin' | 'prep' | 'review';
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{project.name}</span>
          <ProjectHealthBadge health={project.health} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {project.external_url && (
            <a
              href={project.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Progress */}
      <ProjectProgressBar
        total={project.milestones_total}
        done={project.milestones_done}
        pct={project.completion_pct}
      />

      {/* Extra info for prep/review modes */}
      {mode !== 'checkin' && project.due_date && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Prazo: {format(parseISO(project.due_date), "dd MMM yyyy", { locale: ptBR })}</span>
        </div>
      )}
    </div>
  );
}
