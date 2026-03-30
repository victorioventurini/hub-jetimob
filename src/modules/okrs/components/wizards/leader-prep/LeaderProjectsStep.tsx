/**
 * LeaderProjectsStep - Projetos do time com milestones inline
 * Permite atualizar status de milestones via MilestoneStatusSelect (fire-and-forget).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, ExternalLink, CalendarDays, StickyNote } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useProjectsForWizard } from '@/modules/projects/hooks/useProjectsForWizard';
import { useUpdateMilestone } from '@/modules/projects/hooks/useMilestoneMutations';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectStatusBadge } from '@/modules/projects/components/ProjectStatusBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { MilestoneStatusSelect } from '@/modules/projects/components/MilestoneStatusSelect';

import type { MilestoneStatus } from '@/modules/projects/types';

// ============================================================
// TYPES
// ============================================================

export interface LeaderProjectsStepProps {
  teamId: string | null;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function LeaderProjectsStep({ teamId, onContinue, onBack }: LeaderProjectsStepProps) {
  const { data: projects, isLoading } = useProjectsForWizard(teamId || undefined);
  const supabase = useBuScopedSupabase();
  const updateMilestone = useUpdateMilestone();

  // Fetch KR links for all projects
  const projectIds = useMemo(() => (projects || []).map(p => p.id), [projects]);
  const { data: krLinksData } = useQuery({
    queryKey: [...projectsKeys.allPrefix(), 'kr-links', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('project_krs')
        .select('project_id, key_result_id, kr:okr_team_key_results!project_krs_key_result_id_fkey(title)')
        .in('project_id', projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // Map project_id -> KR titles
  const krLinksByProject = useMemo(() => {
    const map = new Map<string, Array<{ krId: string; krTitle: string }>>();
    for (const row of (krLinksData || []) as any[]) {
      const existing = map.get(row.project_id) || [];
      existing.push({ krId: row.key_result_id, krTitle: row.kr?.title ?? '' });
      map.set(row.project_id, existing);
    }
    return map;
  }, [krLinksData]);

  // Pending milestones per project (status !== 'done')
  const projectsWithPending = useMemo(() => {
    if (!projects) return [];
    return projects.map(p => ({
      ...p,
      pendingMilestones: (p.milestones || []).filter(m => m.status !== 'done'),
      doneMilestones: (p.milestones || []).filter(m => m.status === 'done'),
    }));
  }, [projects]);

  const handleMilestoneStatusChange = (milestoneId: string, projectId: string, newStatus: MilestoneStatus) => {
    try {
      updateMilestone.mutate({
        id: milestoneId,
        project_id: projectId,
        status: newStatus,
      });
    } catch {
      toast.warning('Não foi possível atualizar o marco. Tente novamente.');
    }
  };

  const header = (
    <WizardStepHeader
      icon={FolderKanban}
      variant="purple"
      title="Projetos do Time"
      tooltip="leader-projects"
      description="Marcos e entregas em andamento"
      badge={projects?.length ? `${projects.length}` : undefined}
    />
  );

  const footer = (
    <WizardStepFooter
      onBack={onBack}
      onPrimary={onContinue}
      primaryLabel="Continuar"
    />
  );

  return (
    <WizardStepScaffold header={header} footer={footer}>
      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : !projectsWithPending.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h4 className="font-medium text-lg">Nenhum projeto ativo neste time</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Projetos planejados, em andamento ou pausados aparecerão aqui.
            </p>
          </div>
        ) : (
          projectsWithPending.map(project => (
            <Card key={project.id}>
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
                {project.pendingMilestones.length > 0 ? (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Marcos pendentes ({project.pendingMilestones.length})
                    </p>
                    {project.pendingMilestones.map(ms => (
                      <div
                        key={ms.id}
                        className="flex items-center gap-2 py-1 min-w-0"
                      >
                        <MilestoneStatusSelect
                          value={ms.status}
                          onValueChange={(s) => handleMilestoneStatusChange(ms.id, project.id, s)}
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
          ))
        )}
      </div>
    </WizardStepScaffold>
  );
}
