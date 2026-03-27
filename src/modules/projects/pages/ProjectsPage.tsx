/**
 * ProjectsPage — /projects
 * 
 * Lista de projetos com filtros na URL e toggle lista/gantt.
 */

import { useState, useCallback } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, useLocalSearch } from '@/shared/url';
import { useProjects } from '../hooks/useProjects';
import { useCreateProject } from '../hooks/useProjectMutations';
import { useProjectPermissionsV2 } from '../hooks/useProjectPermissionsV2';
import { useGanttData } from '../hooks/useGanttData';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFiltersBar } from '../components/ProjectFiltersBar';
import { ProjectDialog } from '../components/ProjectDialog';
import { ProjectViewToggle, type ProjectViewMode } from '../components/ProjectViewToggle';
import { ProjectGanttChart } from '../components/ProjectGanttChart';
import type { ProjectFilters, ProjectStatus } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function ProjectsPage() {
  usePageTitle('Projetos', {
    customDescription: 'Gerencie projetos estratégicos, acompanhe milestones e vincule a KRs.',
  });

  const navigate = useNavigate();
  const { profileId, realProfileId } = useIdentity();
  const { currentBuId } = useBu();
  const [dialogOpen, setDialogOpen] = useState(false);

  // URL state — canonical pattern
  const statusState = useUrlState<ProjectStatus | 'all'>({ key: 'status', defaultValue: 'all' });
  const ownerState = useUrlState<string>({ key: 'owner', defaultValue: '' });
  const teamState = useUrlState<string>({ key: 'teamId', defaultValue: '' });
  const krLinkState = useUrlState<string>({ key: 'krLink', defaultValue: '' });
  const viewState = useUrlState<ProjectViewMode>({ key: 'view', defaultValue: 'list' });
  const { value: search, setValue: setSearch } = useLocalSearch('q');

  const filters: ProjectFilters = {
    status: statusState.value,
    search: search || undefined,
    owner_id: ownerState.value || undefined,
    team_id: teamState.value || undefined,
    linked_to_kr: krLinkState.value === 'linked' ? true : krLinkState.value === 'not_linked' ? false : null,
  };

  const handleFiltersChange = useCallback((newFilters: ProjectFilters) => {
    statusState.set(newFilters.status ?? 'all');
    ownerState.set(newFilters.owner_id ?? '');
    teamState.set(newFilters.team_id ?? '');
    setSearch(newFilters.search ?? '');
    krLinkState.set(
      newFilters.linked_to_kr === true ? 'linked' : newFilters.linked_to_kr === false ? 'not_linked' : ''
    );
  }, [statusState, ownerState, teamState, setSearch, krLinkState]);

  const { data: projects, isLoading, error } = useProjects(filters);
  const createProject = useCreateProject();
  const { canCreateProject } = useProjectPermissionsV2();

  const writerProfileId = realProfileId ?? profileId;

  const handleCreate = (values: any) => {
    if (!writerProfileId || !currentBuId) return;
    createProject.mutate({
      name: values.name,
      description: values.description || null,
      owner_id: values.owner_id || writerProfileId,
      status: values.status,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
      external_url: values.external_url || null,
      bu_id: currentBuId,
      team_ids: values.team_ids?.length ? values.team_ids : undefined,
    }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Projetos"
          description="Gerencie projetos estratégicos e acompanhe milestones."
          breadcrumbs={[{ label: "Projetos" }]}
          actions={
            canCreateProject ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo projeto
              </Button>
            ) : undefined
          }
        />

        {/* Filters */}
        <ProjectFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar projetos.</p>
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={(id) => navigate(`/projects/${id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
            {canCreateProject && (
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro projeto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isSubmitting={createProject.isPending}
        currentOwnerId={writerProfileId ?? undefined}
      />
    </HubLayout>
  );
}
