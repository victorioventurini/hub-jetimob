import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ExternalLink, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectWithRelations } from '../types';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: ProjectWithRelations;
  onClick?: (projectId: string) => void;
  className?: string;
}

export function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        className,
      )}
      onClick={() => onClick?.(project.id)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ProjectHealthBadge health={project.health} />
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

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {project.owner && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={project.owner.photo_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(project.owner.display_name ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[100px]">{project.owner.display_name}</span>
              </div>
            )}
            <ProjectStatusBadge status={project.status} />
          </div>

          {project.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(parseISO(project.due_date), "dd MMM", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        {/* KRs */}
        {project.krs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.krs.map((kr) => (
              <span
                key={kr.key_result_id}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium truncate max-w-[150px]"
                title={kr.kr_title}
              >
                {kr.kr_title}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
