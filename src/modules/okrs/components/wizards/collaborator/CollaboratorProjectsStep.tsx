/**
 * CollaboratorProjectsStep - Etapa de atualização de Projetos/Milestones
 *
 * Exibe projetos onde o colaborador é owner do projeto OU owner de milestones
 * pendentes. Permite atualizar status de milestones inline (fire-and-forget).
 *
 * Segue padrão wizard-ritual-integration-standard: integração aditiva,
 * sem alterar draft state. Mutations são persistidas imediatamente.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Pencil } from 'lucide-react';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { useUpdateMilestone } from '@/modules/projects/hooks/useMilestoneMutations';
import { useProjectPermissionsV2 } from '@/modules/projects/hooks/useProjectPermissionsV2';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { MilestoneStatusSelect } from '@/modules/projects/components/MilestoneStatusSelect';
import { MilestoneDialog, type MilestoneDialogSubmitValues } from '@/modules/projects/components/MilestoneDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { InlineAgendaSuggestionInput } from '../shared/InlineAgendaSuggestionInput';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MilestoneStatus, ProjectHealth, ProjectStatus } from '@/modules/projects/types';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorProjectsStepProps {
  effectiveUserId: string | null;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  /**
   * Mapa de mudanças de status de milestones bufferizadas no draft.
   * Chave: milestoneId. Valor: novo status pendente.
   * Persistência acontece somente no Concluir do Summary.
   */
  pendingMilestoneStatusChanges?: Record<string, MilestoneStatus>;
  onMilestoneStatusChange?: (milestoneId: string, projectId: string, newStatus: MilestoneStatus) => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

const AGENDA_SOURCE_STEP = 'collaborator-projects';

interface ProjectWithMilestones {
  id: string;
  name: string;
  bu_id: string;
  owner_id: string | null;
  description: string | null;
  external_url: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  team_ids: string[];
  health: ProjectHealth;
  milestones_total: number;
  milestones_done: number;
  completion_pct: number;
  isProjectOwner: boolean;
  milestones: Array<{
    id: string;
    name: string;
    status: MilestoneStatus;
    start_date: string | null;
    due_date: string | null;
    owner_id: string | null;
    notes: string | null;
  }>;
}

interface EditingMilestoneCtx {
  projectId: string;
  milestone: ProjectWithMilestones['milestones'][number];
  projectMilestones: ProjectWithMilestones['milestones'];
}

// ============================================================
// HELPERS
// ============================================================

function computeHealth(status: string, dueDate: string | null, completionPct: number): ProjectHealth {
  if (status === 'done' || status === 'cancelled') return 'on_track';
  if (!dueDate) return 'on_track';
  const now = new Date();
  const due = new Date(dueDate);
  const totalDays = Math.max(1, (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return 'late';
  if (completionPct < 50 && totalDays < 14) return 'at_risk';
  return 'on_track';
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorProjectsStep({
  effectiveUserId,
  onContinue,
  onBack,
  onSkip,
  pendingMilestoneStatusChanges = {},
  onMilestoneStatusChange,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: CollaboratorProjectsStepProps) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const updateMilestone = useUpdateMilestone();
  const { canEditMilestoneRecord } = useProjectPermissionsV2();

  const [editingMilestone, setEditingMilestone] = useState<EditingMilestoneCtx | null>(null);

  // Colunas explícitas (sem select '*'); inclui campos necessários para abrir
  // os dialogs canônicos de edição.
  const PROJECT_COLUMNS =
    'id, name, bu_id, owner_id, description, external_url, status, start_date, due_date, ' +
    'project_teams(team_id), ' +
    'project_milestones(id, name, status, start_date, due_date, owner_id, notes, deleted_at)';

  // Query: projects where user owns milestones
  const { data: milestoneProjects, isLoading: isLoadingMilestones } = useQuery({
    queryKey: projectsKeys.myMilestones(buId, effectiveUserId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_COLUMNS.replace('project_milestones(', 'project_milestones!inner('))
        .eq('bu_id', buId!)
        .eq('project_milestones.owner_id', effectiveUserId!)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!buId && !!effectiveUserId,
  });

  // Query: projects where user is project owner
  const { data: ownedProjects, isLoading: isLoadingOwned } = useQuery({
    queryKey: projectsKeys.myProjects(buId, effectiveUserId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_COLUMNS)
        .eq('bu_id', buId!)
        .eq('owner_id', effectiveUserId!)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!buId && !!effectiveUserId,
  });

  const isLoading = isLoadingMilestones || isLoadingOwned;

  // Merge and deduplicate by project id
  const projects: ProjectWithMilestones[] = useMemo(() => {
    const map = new Map<string, ProjectWithMilestones>();

    const processProject = (p: any) => {
      if (map.has(p.id)) return;
      const rawMilestones = (p.project_milestones ?? []).filter(
        (m: any) => !m.deleted_at
      );
      const total = rawMilestones.length;
      const done = rawMilestones.filter((m: any) => m.status === 'done').length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      map.set(p.id, {
        id: p.id,
        name: p.name,
        bu_id: p.bu_id,
        owner_id: p.owner_id ?? null,
        description: p.description ?? null,
        external_url: p.external_url ?? null,
        status: p.status as ProjectStatus,
        start_date: p.start_date ?? null,
        due_date: p.due_date,
        team_ids: Array.isArray(p.project_teams)
          ? p.project_teams.map((t: any) => t.team_id).filter(Boolean)
          : [],
        health: computeHealth(p.status, p.due_date, pct),
        milestones_total: total,
        milestones_done: done,
        completion_pct: pct,
        isProjectOwner: !!effectiveUserId && p.owner_id === effectiveUserId,
        milestones: rawMilestones
          .filter((m: any) => m.status !== 'done' && m.owner_id === effectiveUserId)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            status: m.status as MilestoneStatus,
            start_date: m.start_date ?? null,
            due_date: m.due_date,
            owner_id: m.owner_id,
            notes: m.notes,
          })),
      });
    };

    (milestoneProjects ?? []).forEach(processProject);
    (ownedProjects ?? []).forEach(processProject);

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [milestoneProjects, ownedProjects, effectiveUserId]);

  // Toggle de status inline: APENAS bufferiza no draft.
  // Persistência acontece no Concluir do Summary (handleComplete).
  const handleMilestoneStatusChange = (milestoneId: string, projectId: string, newStatus: MilestoneStatus) => {
    if (onMilestoneStatusChange) {
      onMilestoneStatusChange(milestoneId, projectId, newStatus);
    } else {
      // Fallback (uso fora do wizard colaborador) — mantém comportamento ao vivo
      try {
        updateMilestone.mutate({ id: milestoneId, project_id: projectId, status: newStatus });
      } catch (error) {
        console.warn('[CollaboratorProjectsStep] Milestone update failed:', error);
        toast.warning('Não foi possível atualizar o milestone. Tente novamente pelo módulo de Projetos.');
      }
    }
  };

  // Permissão row-aware para abrir o MilestoneDialog em modo edit.
  // Não consultamos `useIsLeaderOfProjectOwner` aqui (seria 1 RPC por projeto
  // dentro de um loop). A query do step já restringe a projetos onde o
  // colaborador é owner do projeto OU owner do milestone — exatamente os
  // dois caminhos que `canEditMilestoneRecord` libera no frontend. Líderes
  // editam pelo módulo de Projetos.
  const canEditMilestoneRow = (
    project: ProjectWithMilestones,
    milestoneOwnerId: string | null,
  ) =>
    canEditMilestoneRecord(
      milestoneOwnerId,
      project.owner_id,
      effectiveUserId,
      false,
    );

  const handleMilestoneEditSubmit = (data: MilestoneDialogSubmitValues) => {
    if (!editingMilestone) return;
    updateMilestone.mutate(
      {
        id: editingMilestone.milestone.id,
        project_id: editingMilestone.projectId,
        name: data.name,
        start_date: data.start_date,
        due_date: data.due_date,
        owner_id: data.owner_id,
        notes: data.notes,
      },
      { onSuccess: () => setEditingMilestone(null) },
    );
  };



  const pendingMilestonesCount = projects.reduce((acc, p) => acc + p.milestones.length, 0);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={FolderKanban}
          title="Projetos"
          tooltip="collaborator-projects"
          description="Atualize o status dos marcos sob sua responsabilidade"
          variant="purple"
          badge={!isLoading && projects.length > 0 ? `${pendingMilestonesCount} pendente${pendingMilestonesCount !== 1 ? 's' : ''}` : undefined}
        />
      }
      footer={
        <WizardStepFooter
          showBack
          onBack={onBack}
          primaryLabel="Continuar"
          onPrimary={onContinue}
          showSkip
          skipLabel="Pular"
          onSkip={onSkip}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep={AGENDA_SOURCE_STEP}
            triggerLabel={agendaTriggerLabel}
          />
        ) : undefined
      }
    >
      <div className="p-4 md:p-6 space-y-4 min-w-0 max-w-full">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              Nenhum projeto sob sua responsabilidade neste momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => (
              <div
                key={project.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3 min-w-0"
              >
                {/* Project header */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
                    {project.name}
                  </h3>
                  <ProjectHealthBadge health={project.health} />
                </div>


                {/* Progress */}
                <ProjectProgressBar
                  total={project.milestones_total}
                  done={project.milestones_done}
                  pct={project.completion_pct}
                  showPct
                />

                {/* Pending milestones */}
                {project.milestones.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      Marcos pendentes
                    </p>
                    {project.milestones.map(milestone => {
                      const canEdit = canEditMilestoneRow(project, milestone.owner_id);
                      const pendingStatus = pendingMilestoneStatusChanges[milestone.id];
                      const effectiveStatus = pendingStatus ?? milestone.status;
                      const hasPendingChange = pendingStatus !== undefined && pendingStatus !== milestone.status;
                      return (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-2 py-1 min-w-0"
                        >
                          <MilestoneStatusSelect
                            value={effectiveStatus}
                            onValueChange={(newStatus) =>
                              handleMilestoneStatusChange(milestone.id, project.id, newStatus)
                            }
                          />
                          <span className="text-sm text-foreground truncate flex-1 min-w-0">
                            {milestone.name}
                          </span>
                          {hasPendingChange && (
                            <Badge variant="outline" className="text-[10px] shrink-0 border-warning/40 text-warning">
                              alterado
                            </Badge>
                          )}
                          {milestone.due_date && (
                            <span className={cn(
                              'text-xs whitespace-nowrap shrink-0',
                              new Date(milestone.due_date) < new Date()
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            )}>
                              {new Date(milestone.due_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              aria-label="Editar milestone"
                              onClick={() =>
                                setEditingMilestone({ projectId: project.id, milestone, projectMilestones: project.milestones })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Todos os marcos concluídos ✓
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestone Edit Dialog (canonical) — montado por demanda */}
      {editingMilestone && (
        <MilestoneDialog
          open={!!editingMilestone}
          onOpenChange={(open) => { if (!open) setEditingMilestone(null); }}
          onSubmit={handleMilestoneEditSubmit}
          isSubmitting={updateMilestone.isPending}
          title="Editar milestone"
          defaultValues={{
            name: editingMilestone.milestone.name,
            start_date: editingMilestone.milestone.start_date ?? '',
            due_date: editingMilestone.milestone.due_date ?? '',
            owner_id: editingMilestone.milestone.owner_id ?? '',
            notes: editingMilestone.milestone.notes ?? '',
          }}
          existingMilestones={editingMilestone.projectMilestones}
          currentMilestoneId={editingMilestone.milestone.id}
        />
      )}


    </WizardStepScaffold>
  );
}
