/**
 * KrLinkedDetails — Initiatives, Projects & Milestones linked to a KR
 *
 * Collapsible section rendered inside KR cards. Shows:
 * - Initiatives with status badges
 * - Projects with health badge, progress & inline milestones
 *
 * Props:
 * - defaultExpanded: if true, sections start expanded (default: false)
 */

import { useState } from 'react';
import { ChevronDown, Lightbulb, FolderKanban, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKrInitiatives } from '@/modules/okrs/hooks/useInitiatives';
import { useProjectsForKr } from '@/modules/projects/hooks/useProjectsForKr';
import { InitiativeStatusBadge } from '@/modules/okrs/components/initiatives/InitiativeStatusBadge';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { Skeleton } from '@/components/ui/skeleton';
import type { MilestoneStatus } from '@/modules/projects/types';

const MILESTONE_ICON: Record<MilestoneStatus, React.ReactNode> = {
  todo: <Circle className="h-3 w-3 text-muted-foreground shrink-0" />,
  in_progress: <Clock className="h-3 w-3 text-status-amber shrink-0" />,
  done: <CheckCircle2 className="h-3 w-3 text-status-green shrink-0" />,
};

export interface KrLinkedDetailsProps {
  krId: string;
  /** Start sections expanded (default: false) */
  defaultExpanded?: boolean;
}

export function KrLinkedDetails({ krId, defaultExpanded = false }: KrLinkedDetailsProps) {
  const { data: initiatives, isLoading: loadingInit } = useKrInitiatives(krId);
  const { data: projects, isLoading: loadingProj } = useProjectsForKr(krId);

  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasInitiatives = (initiatives?.length ?? 0) > 0;
  const hasProjects = (projects?.length ?? 0) > 0;
  const isLoading = loadingInit || loadingProj;

  // Still loading — show skeleton placeholder
  if (isLoading) {
    return (
      <div className="mt-2 ml-9">
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  // Nothing linked — don't render at all
  if (!hasInitiatives && !hasProjects) return null;

  const initCount = initiatives?.length ?? 0;
  const projCount = projects?.length ?? 0;

  return (
    <div className="mt-2 ml-9">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            expanded && 'rotate-180',
          )}
        />
        {hasInitiatives && (
          <span className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {initCount} iniciativa{initCount !== 1 ? 's' : ''}
          </span>
        )}
        {hasInitiatives && hasProjects && <span>·</span>}
        {hasProjects && (
          <span className="flex items-center gap-1">
            <FolderKanban className="h-3 w-3" />
            {projCount} projeto{projCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-3 text-xs">
          {/* Initiatives */}
          {hasInitiatives && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Iniciativas ({initCount})
              </p>
              <ul className="space-y-1 pl-1">
                {initiatives!.map((init) => (
                  <li key={init.id} className="flex items-center gap-2">
                    <InitiativeStatusBadge status={init.status} className="text-[10px] py-0 px-1.5 h-5" />
                    <span className="truncate">{init.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Projects with milestones */}
          {hasProjects && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FolderKanban className="h-3 w-3" /> Projetos ({projCount})
              </p>
              {projects!.map((proj) => {
                const milestones = proj.milestones || [];
                const pendingMilestones = milestones.filter(m => m.status !== 'done');
                const doneMilestones = milestones.filter(m => m.status === 'done');

                return (
                  <div key={proj.id} className="pl-1 space-y-1">
                    {/* Project header */}
                    <div className="flex items-center gap-2">
                      <ProjectHealthBadge health={proj.health} dotOnly />
                      <span className="truncate font-medium">{proj.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {proj.completion_pct}%
                      </span>
                    </div>

                    {/* Milestones inline */}
                    {milestones.length > 0 && (
                      <ul className="pl-4 space-y-0.5">
                        {pendingMilestones.map((ms) => (
                          <li key={ms.id} className="flex items-center gap-1.5 text-[11px]">
                            {MILESTONE_ICON[ms.status as MilestoneStatus] ?? MILESTONE_ICON.todo}
                            <span className="truncate">{ms.name}</span>
                            {ms.due_date && (
                              <span className="text-muted-foreground shrink-0 text-[10px]">
                                {new Date(ms.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </li>
                        ))}
                        {doneMilestones.map((ms) => (
                          <li key={ms.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-status-green" />
                            <span className="truncate line-through">{ms.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
