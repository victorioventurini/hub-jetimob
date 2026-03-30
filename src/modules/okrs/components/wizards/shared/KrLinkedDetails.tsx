/**
 * KrLinkedDetails — Initiatives & Projects linked to a KR
 *
 * Collapsible section rendered inside KR cards. Only shows when
 * the KR has at least one initiative or project linked.
 * Reuses existing hooks (useKrInitiatives, useProjectsForKr)
 * and canonical badge components (InitiativeStatusBadge, ProjectHealthBadge).
 */

import { useState } from 'react';
import { ChevronDown, Lightbulb, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKrInitiatives } from '@/modules/okrs/hooks/useInitiatives';
import { useProjectsForKr } from '@/modules/projects/hooks/useProjectsForKr';
import { InitiativeStatusBadge } from '@/modules/okrs/components/initiatives/InitiativeStatusBadge';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { Skeleton } from '@/components/ui/skeleton';

export interface KrLinkedDetailsProps {
  krId: string;
}

export function KrLinkedDetails({ krId }: KrLinkedDetailsProps) {
  const { data: initiatives, isLoading: loadingInit } = useKrInitiatives(krId);
  const { data: projects, isLoading: loadingProj } = useProjectsForKr(krId);

  const [expanded, setExpanded] = useState(false);

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

          {/* Projects */}
          {hasProjects && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FolderKanban className="h-3 w-3" /> Projetos ({projCount})
              </p>
              <ul className="space-y-1 pl-1">
                {projects!.map((proj) => (
                  <li key={proj.id} className="flex items-center gap-2">
                    <ProjectHealthBadge health={proj.health} dotOnly />
                    <span className="truncate">{proj.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {proj.completion_pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
