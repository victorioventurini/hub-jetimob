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
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ExternalLink, ChevronDown, ChevronUp, FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectsForWizard } from '../hooks/useProjectsForWizard';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectForWizard } from '../types';

interface ProjectsSummaryProps {
  teamId: string;
  mode: 'checkin' | 'prep' | 'review';
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
// ProjectSummaryItem
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
