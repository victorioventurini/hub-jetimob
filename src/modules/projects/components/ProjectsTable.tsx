/**
 * ProjectsTable — Table view for projects listing
 * 
 * Follows the TicketsTable canonical pattern: proper Table with columns.
 */

import { Link } from 'react-router-dom';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Clock, ExternalLink, Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { EntityNamesCell } from '@/components/ui/entity-names-cell';
import type { ProjectWithRelations } from '../types';

interface ProjectsTableProps {
  projects: ProjectWithRelations[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full min-w-[280px]">Projeto</TableHead>
            <TableHead className="w-px whitespace-nowrap">Status</TableHead>
            <TableHead className="w-px whitespace-nowrap">Saúde</TableHead>
            <TableHead className="w-px whitespace-nowrap">Responsável</TableHead>
            <TableHead className="w-px whitespace-nowrap">Times</TableHead>
            <TableHead className="w-[180px]">Progresso</TableHead>
            <TableHead className="w-px whitespace-nowrap text-center">Marcos</TableHead>
            <TableHead className="w-px whitespace-nowrap">Prazo</TableHead>
            <TableHead className="w-px whitespace-nowrap text-right">KRs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const isOverdue =
              project.due_date &&
              project.status !== 'done' &&
              project.status !== 'cancelled' &&
              isPast(parseISO(project.due_date));

            return (
              <TableRow
                key={project.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  isOverdue && 'bg-destructive/5',
                )}
              >
                {/* Name */}
                <TableCell>
                  <Link
                    to={`/projects/${project.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                        {project.name}
                      </span>
                      {isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      {project.external_url && (
                        <a
                          href={project.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title={project.external_url}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </Link>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>

                {/* Health */}
                <TableCell>
                  <ProjectHealthBadge health={project.health} />
                </TableCell>

                {/* Owner */}
                <TableCell>
                  {project.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.owner.photo_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(project.owner.display_name ?? '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm line-clamp-1">{project.owner.display_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Teams */}
                <TableCell>
                  <EntityNamesCell
                    teamNames={project.teams.map((t) => t.team_name)}
                    maxVisible={2}
                    variant="outline"
                    emptyText="—"
                  />
                </TableCell>

                {/* Progress */}
                <TableCell>
                  <div className="min-w-[100px] max-w-[160px]">
                    <ProjectProgressBar
                      total={project.milestones_total}
                      done={project.milestones_done}
                      pct={project.completion_pct}
                      showLabel={false}
                      showPct
                    />
                  </div>
                </TableCell>

                {/* Milestones count */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Milestone className="h-3.5 w-3.5" />
                    <span>
                      {project.milestones_done}/{project.milestones_total}
                    </span>
                  </div>
                </TableCell>

                {/* Due date */}
                <TableCell>
                  {project.due_date ? (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-sm',
                        isOverdue && 'text-destructive font-medium',
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {format(parseISO(project.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* KRs */}
                <TableCell className="text-right">
                  {project.krs.length > 0 ? (
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      {project.krs.slice(0, 2).map((kr) => (
                        <span
                          key={kr.key_result_id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium truncate max-w-[120px]"
                          title={kr.kr_title}
                        >
                          {kr.kr_title}
                        </span>
                      ))}
                      {project.krs.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{project.krs.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
