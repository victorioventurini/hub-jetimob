/**
 * ProjectsForKrSection - Projetos vinculados a um KR
 * 
 * Exibido abaixo de InitiativesSummary na visão de detalhe do KR.
 */

import { Badge } from '@/components/ui/badge';
import { ExternalLink, FolderKanban } from 'lucide-react';
import { useProjectsForKr, type ProjectForKr } from '../hooks/useProjectsForKr';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectsForKrSectionProps {
  krId: string;
  className?: string;
}

const impactLabel: Record<string, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export function ProjectsForKrSection({ krId, className }: ProjectsForKrSectionProps) {
  const { data: projects, isLoading } = useProjectsForKr(krId);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (!projects || projects.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Projetos vinculados</span>
        <Badge variant="outline" className="text-xs">{projects.length}</Badge>
      </div>

      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ProjectHealthBadge health={project.health} />
                <span className="text-sm font-medium truncate">{project.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {project.due_date && (
                  <span className="text-xs text-muted-foreground">
                    até {format(parseISO(project.due_date), "dd MMM", { locale: ptBR })}
                  </span>
                )}
                {project.external_url && (
                  <a
                    href={project.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <ProjectProgressBar
                total={project.milestones_total}
                done={project.milestones_done}
                pct={project.completion_pct}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground shrink-0">
                Impacto: {impactLabel[project.impact] ?? project.impact}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
