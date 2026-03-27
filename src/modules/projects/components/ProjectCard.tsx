import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ExternalLink, Calendar, Milestone } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectWithRelations } from '../types';
import { cn } from '@/lib/utils';
import { getExternalUrlLabel } from '../utils/externalUrlLabel';

interface ProjectCardProps {
  project: ProjectWithRelations;
  onClick?: (projectId: string) => void;
  className?: string;
}

export function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  const isOverdue = project.due_date && project.status !== 'done' && project.status !== 'cancelled' && isPast(parseISO(project.due_date));

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        className,
      )}
      onClick={() => onClick?.(project.id)}
    >
      <CardContent className="p-5 space-y-2">
        {/* Row 1 — Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectHealthBadge health={project.health} dotOnly />
          <h3 className="font-semibold text-sm truncate max-w-[280px]">{project.name}</h3>
          <ProjectStatusBadge status={project.status} />

          {/* KR tags */}
          {project.krs.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {project.krs.map((kr) => (
                <span
                  key={kr.key_result_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium truncate max-w-[180px]"
                  title={kr.kr_title}
                >
                  OKR · {kr.kr_title}
                </span>
              ))}
            </div>
          )}

          {/* External link */}
          {project.external_url && (
            <a
              href={project.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {getExternalUrlLabel(project.external_url)}
            </a>
          )}
        </div>

        {/* Row 2 — Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {/* Owner */}
          {project.owner && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={project.owner.photo_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(project.owner.display_name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{project.owner.display_name}</span>
            </div>
          )}

          {/* Teams */}
          {project.teams.length > 0 && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1">
                {project.teams.map((t) => (
                  <span
                    key={t.team_id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-medium truncate max-w-[100px]"
                  >
                    {t.team_name}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Due date */}
          {project.due_date && (
            <>
              <span className="text-border">|</span>
              <div className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-destructive',
              )}>
                <Calendar className="h-3 w-3" />
                <span>Até {format(parseISO(project.due_date), "dd MMM", { locale: ptBR })}</span>
              </div>
            </>
          )}

          {/* Progress */}
          <span className="text-border">|</span>
          <div className="flex items-center gap-2 min-w-[120px] max-w-[200px]">
            <ProjectProgressBar
              total={project.milestones_total}
              done={project.milestones_done}
              pct={project.completion_pct}
              showLabel={false}
              showPct
            />
          </div>

          {/* Milestones count */}
          <div className="flex items-center gap-1">
            <Milestone className="h-3 w-3" />
            <span>{project.milestones_total} {project.milestones_total === 1 ? 'milestone' : 'milestones'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
