/**
 * UnlinkedProjectsList — Shows team projects not linked to any KR
 *
 * Uses useProjectsForWizard (all team projects) and useProjectsForKr (per KR)
 * to identify unlinked projects. Displays them at the bottom of balance steps.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQbrPreTeamProjects } from '@/modules/okrs/hooks/useQbrPreTeamProjects';
import { useProjectsForKr } from '@/modules/projects/hooks/useProjectsForKr';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import type { MilestoneStatus } from '@/modules/projects/types';

const MILESTONE_ICON: Record<MilestoneStatus, React.ReactNode> = {
  todo: <Circle className="h-3 w-3 text-muted-foreground shrink-0" />,
  in_progress: <Clock className="h-3 w-3 text-status-amber shrink-0" />,
  done: <CheckCircle2 className="h-3 w-3 text-status-green shrink-0" />,
};

interface UnlinkedProjectsListProps {
  teamId: string;
  linkedKrIds: string[];
}

/**
 * Hook to aggregate all project IDs linked to any of the given KR IDs.
 * Uses individual useProjectsForKr calls (cached by react-query).
 */
function useLinkedProjectIds(krIds: string[]): { linkedIds: Set<string>; isLoading: boolean } {
  // We query for each KR — react-query caches individually
  const queries = krIds.map(id => useProjectsForKr(id));

  return useMemo(() => {
    const ids = new Set<string>();
    let loading = false;

    for (const q of queries) {
      if (q.isLoading) loading = true;
      for (const p of q.data || []) {
        ids.add(p.id);
      }
    }

    return { linkedIds: ids, isLoading: loading };
  }, [queries]);
}

export function UnlinkedProjectsList({ teamId, linkedKrIds }: UnlinkedProjectsListProps) {
  const { data: allProjects, isLoading: loadingAll } = useQbrPreTeamProjects(teamId);
  const { linkedIds, isLoading: loadingLinked } = useLinkedProjectIds(linkedKrIds);

  const unlinkedProjects = useMemo(() => {
    if (!allProjects) return [];
    return allProjects.filter(p => !linkedIds.has(p.id));
  }, [allProjects, linkedIds]);

  if (loadingAll || loadingLinked) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (unlinkedProjects.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Projetos sem vínculo com KRs</span>
        <Badge variant="outline" className="text-xs">{unlinkedProjects.length}</Badge>
      </div>

      {unlinkedProjects.map((project) => {
        const milestones = project.milestones || [];
        const pendingMs = milestones.filter(m => m.status !== 'done');
        const doneMs = milestones.filter(m => m.status === 'done');

        return (
          <Card key={project.id}>
            <CardContent className="p-4 space-y-2">
              {/* Project header */}
              <div className="flex items-center gap-2">
                <ProjectHealthBadge health={project.health} />
                <span className="text-sm font-medium truncate flex-1">{project.name}</span>
              </div>

              <ProjectProgressBar
                total={project.milestones_total}
                done={project.milestones_done}
                pct={project.completion_pct}
                showPct
              />

              {/* Milestones */}
              {milestones.length > 0 && (
                <ul className="space-y-1 pl-1 text-xs">
                  {pendingMs.map((ms) => (
                    <li key={ms.id} className="flex items-center gap-1.5">
                      {MILESTONE_ICON[ms.status as MilestoneStatus] ?? MILESTONE_ICON.todo}
                      <span className="truncate">{ms.name}</span>
                      {ms.due_date && (
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {new Date(ms.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </li>
                  ))}
                  {doneMs.map((ms) => (
                    <li key={ms.id} className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-status-green" />
                      <span className="truncate line-through">{ms.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
