/**
 * ProjectDetailPage — /projects/:id
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Pencil, Trash2, Calendar, List, GanttChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProject } from '../hooks/useProject';
import { useMilestones } from '../hooks/useMilestones';
import { useUpdateProject, useSoftDeleteProject } from '../hooks/useProjectMutations';
import { useCreateMilestone, useUpdateMilestone, useSoftDeleteMilestone } from '../hooks/useMilestoneMutations';
import { useProjectPermissionsV2 } from '../hooks/useProjectPermissionsV2';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { ProjectHealthBadge } from '../components/ProjectHealthBadge';
import { ProjectStatusBadge } from '../components/ProjectStatusBadge';
import { ProjectProgressBar } from '../components/ProjectProgressBar';
import { MilestoneList } from '../components/MilestoneList';
import { MilestoneCreateForm } from '../components/MilestoneCreateForm';
import { MilestoneGanttChart } from '../components/MilestoneGanttChart';
import { ProjectDialog } from '../components/ProjectDialog';
import { ProjectKrLinkSection } from '../components/ProjectKrLinkSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MilestoneStatus } from '../types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileId, realProfileId } = useIdentity();
  const { currentBuId } = useBu();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project, isLoading } = useProject(id);
  const { data: milestones } = useMilestones(id);
  const updateProject = useUpdateProject();
  const deleteProject = useSoftDeleteProject();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useSoftDeleteMilestone();
  const { canEditProject, canDeleteProject, canCreateMilestone: canAddMilestone, canEditMilestone } = useProjectPermissionsV2();

  const projectName = project?.name ?? 'Projeto';

  usePageTitle(projectName, {
    customDescription: project?.description
      ? `${projectName} — ${project.description}`
      : `Detalhes do projeto ${projectName} no Hub.`,
  });

  const writerProfileId = realProfileId ?? profileId;

  // Build owner profiles map from project owner + any future sources
  const ownerProfiles = useMemo(() => {
    const map: Record<string, { display_name: string | null; photo_url: string | null }> = {};
    if (project?.owner) {
      map[project.owner.id] = {
        display_name: project.owner.display_name,
        photo_url: project.owner.photo_url,
      };
    }
    return map;
  }, [project?.owner]);

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

  const handleAddMilestone = (data: { name: string; due_date: string | null; owner_id: string | null }) => {
    if (!currentBuId || !id) return;
    createMilestone.mutate({
      project_id: id,
      name: data.name,
      due_date: data.due_date,
      owner_id: data.owner_id,
      bu_id: currentBuId,
    });
  };

  const handleMilestoneStatusChange = (milestoneId: string, status: MilestoneStatus) => {
    if (!id) return;
    updateMilestone.mutate({ id: milestoneId, project_id: id, status });
  };

  const handleMilestoneUpdate = (milestoneId: string, updates: { due_date?: string | null; owner_id?: string | null }) => {
    if (!id) return;
    updateMilestone.mutate({ id: milestoneId, project_id: id, ...updates });
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    if (!id) return;
    deleteMilestone.mutate({ id: milestoneId, project_id: id });
  };

  const handleEdit = (values: any) => {
    updateProject.mutate({
      id: project.id,
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
    deleteProject.mutate(project.id, {
      onSuccess: () => navigate('/projects'),
    });
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {project.external_url && (
        <Button variant="outline" size="sm" asChild>
          <a href={project.external_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Link externo
          </a>
        </Button>
      )}
      {canEditProject && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      )}
      {canDeleteProject && (
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <HubLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header with breadcrumbs */}
        <PageHeader
          title={project.name}
          breadcrumbs={[
            { label: "Projetos", href: "/projects" },
            { label: project.name },
          ]}
          actions={headerActions}
        />

        {/* Badges + description below header */}
        <div className="flex items-center gap-2 -mt-4">
          <ProjectHealthBadge health={project.health} />
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.description && (
          <p className="text-muted-foreground text-sm -mt-2">{project.description}</p>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MilestoneList
              milestones={milestones || project.milestones || []}
              projectId={project.id}
              onStatusChange={canEditMilestone ? handleMilestoneStatusChange : undefined}
              onUpdate={canEditMilestone ? handleMilestoneUpdate : undefined}
              onDelete={canEditMilestone ? handleMilestoneDelete : undefined}
              canEditKrLinks={canEditMilestone}
              canEdit={canEditMilestone}
              ownerProfiles={ownerProfiles}
            />
            {canAddMilestone && (
              <MilestoneCreateForm
                onSubmit={handleAddMilestone}
                isPending={createMilestone.isPending}
              />
            )}
          </CardContent>
        </Card>

        {/* KRs vinculadas */}
        <ProjectKrLinkSection
          projectId={project.id}
          linkedKrs={project.krs}
          canEdit={canEditProject}
        />
      </div>

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

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HubLayout>
  );
}
