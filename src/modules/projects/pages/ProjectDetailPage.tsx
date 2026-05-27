/**
 * ProjectDetailPage — /projects/:id
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Pencil, Trash2, Calendar, List, GanttChart, Plus, Archive, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProject } from '../hooks/useProject';
import { useMilestones } from '../hooks/useMilestones';
import { useMilestoneOwnerProfiles } from '../hooks/useMilestoneOwnerProfiles';
import { useUpdateProject, useSoftDeleteProject, useRestoreProject } from '../hooks/useProjectMutations';
import { useCreateMilestone, useUpdateMilestone, useSoftDeleteMilestone } from '../hooks/useMilestoneMutations';
import { useProjectPermissionsV2 } from '../hooks/useProjectPermissionsV2';
import { useIsLeaderOfProjectOwner } from '../hooks/useIsLeaderOfProjectOwner';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { ProjectHealthBadge } from '../components/ProjectHealthBadge';
import { ProjectStatusBadge } from '../components/ProjectStatusBadge';
import { ProjectProgressBar } from '../components/ProjectProgressBar';

import { MilestonesTable } from '../components/MilestonesTable';
import { MilestoneDialog, type MilestoneDialogSubmitValues } from '../components/MilestoneDialog';
import { MilestoneGanttChart } from '../components/MilestoneGanttChart';
import { ProjectDialog } from '../components/ProjectDialog';
import { ProjectKrLinkSection } from '../components/ProjectKrLinkSection';
import { ProjectCommentsSection } from '../components/ProjectCommentsSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MilestoneStatus, ProjectMilestone } from '../types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileId, realProfileId, isLoading: identityLoading } = useIdentity();
  const { currentBuId } = useBu();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<ProjectMilestone | null>(null);
  const [milestoneView, setMilestoneView] = useState<'list' | 'gantt'>('list');

  const { data: project, isLoading } = useProject(id);
  const { data: milestones } = useMilestones(id);
  const updateProject = useUpdateProject();
  const deleteProject = useSoftDeleteProject();
  const restoreProject = useRestoreProject();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useSoftDeleteMilestone();
  const {
    isLoading: permissionsLoading,
    canEditProjectRecord,
    canDeleteProjectRecord,
    canCreateMilestone: rawCanAddMilestone,
    canEditMilestoneRecord,
    canDeleteMilestoneRecord,
  } = useProjectPermissionsV2();

  // Gate canônico: enquanto identidade ou permissões estiverem carregando,
  // tratamos as flags por-registro como FALSAS para evitar falso positivo de UI.
  const permissionsResolved = !identityLoading && !permissionsLoading;

  const projectName = project?.name ?? 'Projeto';

  usePageTitle(projectName, {
    customDescription: project?.description
      ? `${projectName} — ${project.description}`
      : `Detalhes do projeto ${projectName} no Next.`,
  });

  const writerProfileId = realProfileId ?? profileId;

  // Caminho "líder do responsável": consulta a função canônica do banco
  // (`is_leader_of_project_owner`) para casar exatamente com a RLS.
  const { data: isLeaderOfOwner = false, isLoading: isLeaderCheckLoading } =
    useIsLeaderOfProjectOwner(project?.owner_id);

  const baseEdit =
    permissionsResolved && canEditProjectRecord(project?.owner_id, writerProfileId);
  const baseDelete =
    permissionsResolved && canDeleteProjectRecord(project?.owner_id, writerProfileId);

  const isArchived = !!project?.is_archived;

  const canEditThisProject =
    !isArchived && (baseEdit || (permissionsResolved && isLeaderOfOwner));
  const canDeleteThisProject =
    !isArchived && (baseDelete || (permissionsResolved && isLeaderOfOwner));
  const canRestoreThisProject =
    isArchived && (baseDelete || (permissionsResolved && isLeaderOfOwner));

  // Milestone CRUD: bloqueado em projetos arquivados (read-only canônico).
  const canAddMilestone = !isArchived && rawCanAddMilestone;

  /**
   * Gating row-aware das milestones (espelha a RLS canônica v2026-04-27):
   * - Editar: project owner OR milestone owner OR estrutural (admin/líder/`projects.milestone.update:bu`).
   * - Remover: project owner OR estrutural (admin/líder/`projects.milestone.delete:bu`).
   * Em projetos arquivados, ambas as ações são bloqueadas (read-only canônico).
   */
  const canEditMilestoneRow = (m: ProjectMilestone): boolean => {
    if (isArchived || !permissionsResolved) return false;
    return canEditMilestoneRecord(
      m.owner_id,
      project?.owner_id ?? null,
      writerProfileId,
      isLeaderOfOwner,
    );
  };

  const canDeleteMilestoneRow = (_m: ProjectMilestone): boolean => {
    if (isArchived || !permissionsResolved) return false;
    return canDeleteMilestoneRecord(
      project?.owner_id ?? null,
      writerProfileId,
      isLeaderOfOwner,
    );
  };

  // Observabilidade: gating row-aware do detalhe do projeto.
  // TEMP: instrumentação para diferenciar bundle stale vs RLS legítima no live.
  useEffect(() => {
    if (!project) return;
    console.info('[ProjectDetailPage] permission gate', {
      projectId: project.id,
      ownerId: project.owner_id,
      writerProfileId,
      permissionsResolved,
      identityLoading,
      permissionsLoading,
      isLeaderCheckLoading,
      isLeaderOfOwner,
      canEditThisProject,
      canDeleteThisProject,
    });
  }, [
    project,
    writerProfileId,
    permissionsResolved,
    identityLoading,
    permissionsLoading,
    isLeaderCheckLoading,
    isLeaderOfOwner,
    canEditThisProject,
    canDeleteThisProject,
  ]);

  // Defesa em profundidade: fecha o dialog automaticamente se a permissão sumir
  // (ex.: troca de impersonação, refetch que muda owner_id, etc.).
  useEffect(() => {
    if (deleteOpen && !canDeleteThisProject) {
      setDeleteOpen(false);
    }
  }, [deleteOpen, canDeleteThisProject]);

  // Build owner profiles map: project owner + responsáveis (owner_id) de cada milestone.
  // Sem isso, milestones com responsável diferente do owner do projeto ficavam sem
  // avatar/nome na view de detalhe.
  const milestoneList = milestones || project?.milestones || [];
  const milestoneOwnerIds = useMemo(
    () => milestoneList.map((m) => m.owner_id).filter(Boolean) as string[],
    [milestoneList],
  );
  const milestoneOwnerProfiles = useMilestoneOwnerProfiles(milestoneOwnerIds);

  const ownerProfiles = useMemo(() => {
    const map: Record<string, { display_name: string | null; photo_url: string | null }> = {
      ...milestoneOwnerProfiles,
    };
    if (project?.owner) {
      map[project.owner.id] = {
        display_name: project.owner.display_name,
        photo_url: project.owner.photo_url,
      };
    }
    return map;
  }, [project?.owner, milestoneOwnerProfiles]);

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </HubLayout>
    );
  }

  if (!project) {
    return (
      <HubLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Projeto não encontrado.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/projects">Voltar</Link>
          </Button>
        </div>
      </HubLayout>
    );
  }

  // BU SCOPE GUARD (defense-in-depth): se o cache servir um projeto de outra BU,
  // recusa renderização enquanto a BU ativa for diferente.
  if (currentBuId && project.bu_id && project.bu_id !== currentBuId) {
    return (
      <HubLayout>
        <div className="text-center py-12 space-y-3">
          <p className="text-base font-medium text-foreground">
            Esse projeto pertence a outra BU 🔒
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Você está visualizando o Next em uma BU diferente da BU desse projeto.
            Selecione a BU correta no topo da tela para acessá-lo.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/projects">Voltar para projetos</Link>
          </Button>
        </div>
      </HubLayout>
    );
  }

  const handleAddMilestone = (data: MilestoneDialogSubmitValues) => {
    if (!currentBuId || !id) return;
    createMilestone.mutate(
      {
        project_id: id,
        name: data.name,
        start_date: data.start_date,
        due_date: data.due_date,
        owner_id: data.owner_id,
        notes: data.notes,
        bu_id: currentBuId,
      },
      { onSuccess: () => setMilestoneDialogOpen(false) },
    );
  };

  const handleMilestoneStatusChange = (milestoneId: string, status: MilestoneStatus) => {
    if (!id) return;
    updateMilestone.mutate({ id: milestoneId, project_id: id, status });
  };



  const handleMilestoneEditSubmit = (data: MilestoneDialogSubmitValues) => {
    if (!id || !editingMilestone) return;
    // Defesa em profundidade: revalidar permissão antes de disparar mutation.
    if (!canEditMilestoneRow(editingMilestone)) {
      setEditingMilestone(null);
      return;
    }
    updateMilestone.mutate(
      {
        id: editingMilestone.id,
        project_id: id,
        name: data.name,
        start_date: data.start_date,
        due_date: data.due_date,
        owner_id: data.owner_id,
        notes: data.notes,
      },
      { onSuccess: () => setEditingMilestone(null) },
    );
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    if (!id || !project) return;
    deleteMilestone.mutate({ id: milestoneId, project_id: id, bu_id: project.bu_id });
  };

  const handleConfirmMilestoneDelete = () => {
    if (!deletingMilestone) return;
    if (!canDeleteMilestoneRow(deletingMilestone)) {
      setDeletingMilestone(null);
      return;
    }
    handleMilestoneDelete(deletingMilestone.id);
    setDeletingMilestone(null);
  };

  const handleEdit = (values: any) => {
    updateProject.mutate({
      id: project.id,
      bu_id: project.bu_id,
      name: values.name,
      description: values.description || null,
      owner_id: values.owner_id || undefined,
      status: values.status,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
      external_url: values.external_url || null,
      team_ids: values.team_ids ?? [],
    }, {
      onSuccess: () => setEditOpen(false),
    });
  };

  const handleDelete = () => {
    // Defesa em profundidade: revalidar permissão antes de disparar mutation,
    // protegendo contra bundle stale, hydration antiga ou estado órfão.
    if (!canDeleteThisProject) {
      setDeleteOpen(false);
      return;
    }
    deleteProject.mutate(
      { id: project.id, bu_id: project.bu_id },
      { onSuccess: () => navigate('/projects') },
    );
  };

  const handleRestore = () => {
    if (!canRestoreThisProject) return;
    restoreProject.mutate({ id: project.id });
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {project.external_url && (
        <Button variant="outline" size="sm" asChild>
          <a href={project.external_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Link externo</span>
          </a>
        </Button>
      )}
      {canRestoreThisProject && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={restoreProject.isPending}
        >
          <RotateCcw className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Restaurar projeto</span>
        </Button>
      )}
      {canEditThisProject && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      )}
      {canDeleteThisProject && (
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header with breadcrumbs */}
        <PageHeader
          title={project.name}
          breadcrumbs={[
            { label: "Projetos", href: "/projects" },
            { label: project.name },
          ]}
          actions={headerActions}
        />

        {/* Banner de projeto arquivado (read-only) */}
        {isArchived && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
            <Archive className="h-5 w-5 mt-0.5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Projeto arquivado</p>
              <p className="text-muted-foreground mt-1">
                Este projeto está arquivado. As edições estão desabilitadas. Use "Restaurar projeto" para reativá-lo.
              </p>
            </div>
          </div>
        )}

        {/* Badges + description below header */}
        <div className="flex items-center gap-2 -mt-4">
          <ProjectHealthBadge health={project.health} />
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.description && (
          <p className="text-muted-foreground text-sm -mt-2">{project.description}</p>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Responsável</div>
              {project.owner ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={project.owner.photo_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(project.owner.display_name ?? '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{project.owner.display_name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Times</div>
              {project.teams.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {project.teams.map((t) => (
                    <span
                      key={t.team_id}
                      className="inline-flex items-center px-2 py-0.5 rounded border border-border text-xs font-medium"
                    >
                      {t.team_name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Prazo</div>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {project.due_date
                  ? format(parseISO(project.due_date), "dd 'de' MMMM yyyy", { locale: ptBR })
                  : 'Sem prazo definido'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Progresso</div>
              <ProjectProgressBar
                total={project.milestones_total}
                done={project.milestones_done}
                pct={project.completion_pct}
              />
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Milestones</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 p-1 bg-muted rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMilestoneView('list')}
                    className={cn(
                      "h-7 px-2 gap-1 rounded-md transition-all text-xs",
                      milestoneView === 'list'
                        ? "bg-background shadow-sm text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lista</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMilestoneView('gantt')}
                    className={cn(
                      "h-7 px-2 gap-1 rounded-md transition-all text-xs",
                      milestoneView === 'gantt'
                        ? "bg-background shadow-sm text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                    )}
                  >
                    <GanttChart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gantt</span>
                  </Button>
                </div>
                {canAddMilestone && (
                  <Button
                    size="sm"
                    onClick={() => setMilestoneDialogOpen(true)}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Novo milestone</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestoneView === 'gantt' ? (
              <MilestoneGanttChart
                milestones={milestones || project.milestones || []}
                projectStartDate={project.start_date}
                projectDueDate={project.due_date}
              />
            ) : (
              <MilestonesTable
                milestones={milestones || project.milestones || []}
                ownerProfiles={ownerProfiles}
                onStatusChange={handleMilestoneStatusChange}
                onEdit={(m) => setEditingMilestone(m)}
                onDelete={(m) => setDeletingMilestone(m)}
                canEditMilestone={canEditMilestoneRow}
                canDeleteMilestone={canDeleteMilestoneRow}
              />
            )}
          </CardContent>
        </Card>

        {/* KRs vinculadas */}
        <ProjectKrLinkSection
          projectId={project.id}
          linkedKrs={project.krs}
          canEdit={canEditThisProject}
        />

        {/* Comentários */}
        <ProjectCommentsSection projectId={project.id} readOnly={isArchived} />
      </div>

      {/* Milestone Create Dialog */}
      {canAddMilestone && (
        <MilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          onSubmit={handleAddMilestone}
          isSubmitting={createMilestone.isPending}
          title="Novo milestone"
          existingMilestones={milestones || project.milestones || []}
          projectStartDate={project?.start_date}
          projectDueDate={project?.due_date}
        />
      )}

      {/* Milestone Edit Dialog — montado por demanda quando o usuário escolhe editar */}
      {editingMilestone && canEditMilestoneRow(editingMilestone) && (
        <MilestoneDialog
          open={!!editingMilestone}
          onOpenChange={(open) => { if (!open) setEditingMilestone(null); }}
          onSubmit={handleMilestoneEditSubmit}
          isSubmitting={updateMilestone.isPending}
          title="Editar milestone"
          defaultValues={{
            name: editingMilestone.name,
            start_date: editingMilestone.start_date ?? '',
            due_date: editingMilestone.due_date ?? '',
            owner_id: editingMilestone.owner_id ?? '',
            notes: editingMilestone.notes ?? '',
          }}
          existingMilestones={milestones || project.milestones || []}
          currentMilestoneId={editingMilestone.id}
          projectStartDate={project?.start_date}
          projectDueDate={project?.due_date}
        />
      )}

      {/* Milestone Delete Confirmation — só montado quando há permissão real para esta linha */}
      {deletingMilestone && canDeleteMilestoneRow(deletingMilestone) && (
        <AlertDialog
          open={!!deletingMilestone}
          onOpenChange={(open) => { if (!open) setDeletingMilestone(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover milestone?</AlertDialogTitle>
              <AlertDialogDescription>
                O milestone "{deletingMilestone.name}" será removido. Essa ação não pode ser desfeita pela interface.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmMilestoneDelete}
                disabled={deleteMilestone.isPending}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Dialog */}
      <ProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        isSubmitting={updateProject.isPending}
        title="Editar projeto"
        currentOwnerId={project.owner_id}
        defaultValues={{
          name: project.name,
          description: project.description ?? '',
          owner_id: project.owner_id,
          team_ids: project.teams.map(t => t.team_id),
          status: project.status,
          start_date: project.start_date ?? '',
          due_date: project.due_date ?? '',
          external_url: project.external_url ?? '',
        }}
      />

      {/* Delete Confirmation — só montado quando há permissão real para arquivar este registro */}
      {canDeleteThisProject && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
              <AlertDialogDescription>
                O projeto "{project.name}" será arquivado. Essa ação pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteProject.isPending}>
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </HubLayout>
  );
}
