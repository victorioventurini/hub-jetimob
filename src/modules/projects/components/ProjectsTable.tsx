/**
 * ProjectsTable — Table view for projects listing
 *
 * Follows the TicketsTable canonical pattern: proper Table with columns.
 *
 * Largura da coluna "Projeto" é calculada com base no maior nome visível
 * (medição via canvas, com fonte do tema), entre 220 e 480 px. Mantém nomes
 * por inteiro sem truncar; só rebate para 2 linhas se ultrapassar o teto.
 *
 * O ícone de link externo (`external_url`) ganhou coluna dedicada à direita
 * — mais escaneável e libera o nome do projeto de elementos extras.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

// Limites canônicos da coluna "Projeto" (px). PROJECT_NAME = 100 chars no SSOT.
const PROJECT_COL_MIN = 220;
const PROJECT_COL_MAX = 480;
// Reserva para o ícone "atrasado" (AlertTriangle) + paddings da célula.
const PROJECT_COL_PADDING = 56;

/**
 * Mede o nome mais longo (em px) usando canvas com a fonte do tema.
 * Fallback estimado quando canvas não está disponível (SSR/teste).
 */
function measureLongestNamePx(names: string[]): number {
  if (names.length === 0) return PROJECT_COL_MIN;

  if (typeof document === 'undefined') {
    // Fallback grosseiro: ~7.5px por caractere a 14px medium.
    const longest = names.reduce((acc, n) => Math.max(acc, n.length), 0);
    return Math.round(longest * 7.5);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const longest = names.reduce((acc, n) => Math.max(acc, n.length), 0);
    return Math.round(longest * 7.5);
  }

  // Mesma fonte aplicada na célula (font-medium = 500). Usa a stack do tema.
  const themeFont = typeof window !== 'undefined'
    ? getComputedStyle(document.body).fontFamily
    : 'system-ui, -apple-system, sans-serif';
  ctx.font = `500 14px ${themeFont}`;

  let max = 0;
  for (const name of names) {
    const w = ctx.measureText(name).width;
    if (w > max) max = w;
  }
  return Math.ceil(max);
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  // Recalcula só quando a lista de nomes muda (filtros, ordenação).
  const namesKey = useMemo(
    () => projects.map((p) => p.name).join('\u0001'),
    [projects],
  );

  // Aplicação em duas etapas para evitar mismatch SSR e respeitar fonts loaded.
  const [columnWidth, setColumnWidth] = useState<number>(PROJECT_COL_MIN);
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (lastKey.current === namesKey) return;
    lastKey.current = namesKey;

    const recompute = () => {
      const measured = measureLongestNamePx(projects.map((p) => p.name));
      const clamped = Math.min(
        PROJECT_COL_MAX,
        Math.max(PROJECT_COL_MIN, measured + PROJECT_COL_PADDING),
      );
      setColumnWidth(clamped);
    };

    recompute();

    // Recalcula quando as fontes terminam de carregar (evita medir com fallback).
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(recompute).catch(() => { /* ignore */ });
    }
  }, [namesKey, projects]);

  const projectColStyle = useMemo(
    () => ({ width: `${columnWidth}px`, minWidth: `${PROJECT_COL_MIN}px`, maxWidth: `${PROJECT_COL_MAX}px` }),
    [columnWidth],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={projectColStyle}>Projeto</TableHead>
              <TableHead className="w-px whitespace-nowrap">Status</TableHead>
              <TableHead className="w-px whitespace-nowrap">Saúde</TableHead>
              <TableHead className="w-px whitespace-nowrap">Responsável</TableHead>
              <TableHead className="w-px whitespace-nowrap">Times</TableHead>
              <TableHead className="w-[180px]">Progresso</TableHead>
              <TableHead className="w-px whitespace-nowrap text-center">Marcos</TableHead>
              <TableHead className="w-px whitespace-nowrap">Prazo</TableHead>
              <TableHead className="w-px whitespace-nowrap text-center">Link</TableHead>
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
                  {/* Name (largura calculada, sem truncar; rebate para 2 linhas se exceder) */}
                  <TableCell style={projectColStyle}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="block group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium group-hover:text-primary transition-colors break-words line-clamp-2">
                          {project.name}
                        </span>
                        {isOverdue && (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </div>
                    </Link>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="whitespace-nowrap">
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>

                  {/* Health */}
                  <TableCell className="whitespace-nowrap">
                    <ProjectHealthBadge health={project.health} />
                  </TableCell>

                  {/* Owner */}
                  <TableCell className="whitespace-nowrap">
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
                    <ProjectProgressBar
                      total={project.milestones_total}
                      done={project.milestones_done}
                      pct={project.completion_pct}
                      showLabel={false}
                      showPct
                    />
                  </TableCell>

                  {/* Milestones count */}
                  <TableCell className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Milestone className="h-3.5 w-3.5" />
                      <span>
                        {project.milestones_done}/{project.milestones_total}
                      </span>
                    </div>
                  </TableCell>

                  {/* Due date */}
                  <TableCell className="whitespace-nowrap">
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

                  {/* External link (coluna dedicada) */}
                  <TableCell className="whitespace-nowrap text-center">
                    {project.external_url ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={project.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Abrir link externo do projeto"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[420px] break-all">
                          {project.external_url}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* KRs */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex justify-end">
                      <EntityNamesCell
                        krNames={project.krs.map((k) => k.kr_title)}
                        maxVisible={2}
                        variant="outline"
                        emptyText="—"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
