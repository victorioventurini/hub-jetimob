/**
 * ProjectsPage — /projects
 * 
 * Lista de projetos com filtros na URL e toggle lista/gantt.
 */

import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { ProjectFiltersBar } from '../components/ProjectFiltersBar';
import { ProjectsTable } from '../components/ProjectsTable';
import { ProjectStatusSummary } from '../components/ProjectStatusSummary';
import { ProjectDialog } from '../components/ProjectDialog';
import { ProjectViewToggle, type ProjectViewMode } from '../components/ProjectViewToggle';
import { ProjectGanttChart } from '../components/ProjectGanttChart';
import type { ProjectArchivedState, ProjectFilters, ProjectHealth, ProjectStatus } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { SavedLinksPopover } from '@/shared/saved-links';

export default function ProjectsPage() {
  usePageTitle('Projetos', {
    customDescription: 'Gerencie projetos estratégicos, acompanhe milestones e vincule a KRs.',
  });

  
  const { profileId, realProfileId } = useIdentity();
  const { currentBuId } = useBu();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();

  // URL state — canonical pattern
  const statusState = useUrlState<ProjectStatus | 'all'>({ key: 'status', defaultValue: 'all' });
  const healthState = useUrlState<ProjectHealth | 'all'>({ key: 'health', defaultValue: 'all' });
  const ownerState = useUrlState<string>({ key: 'owner', defaultValue: '' });
  const teamState = useUrlState<string>({ key: 'teamId', defaultValue: '' });
  const krLinkState = useUrlState<string>({ key: 'krLink', defaultValue: '' });
  const archivedState = useUrlState<ProjectArchivedState>({ key: 'archived', defaultValue: 'active' });
  const viewState = useUrlState<ProjectViewMode>({ key: 'view', defaultValue: 'list' });
  const { value: search, setValue: setSearch } = useLocalSearch('q');

  const filters: ProjectFilters = {
    status: statusState.value,
    health: healthState.value,
    search: search || undefined,
    owner_id: ownerState.value || undefined,
    team_id: teamState.value || undefined,
    linked_to_kr: krLinkState.value === 'linked' ? true : krLinkState.value === 'not_linked' ? false : null,
    archived_state: archivedState.value,
  };

  const handleFiltersChange = useCallback((newFilters: ProjectFilters) => {
    setSearch(newFilters.search ?? '');

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      const status = newFilters.status ?? 'all';
      if (status === 'all') next.delete('status');
      else next.set('status', status);

      const health = newFilters.health ?? 'all';
      if (health === 'all') next.delete('health');
      else next.set('health', health);

      if (newFilters.owner_id) next.set('owner', newFilters.owner_id);
      else next.delete('owner');

      if (newFilters.team_id) next.set('teamId', newFilters.team_id);
      else next.delete('teamId');

      if (newFilters.linked_to_kr === true) next.set('krLink', 'linked');
      else if (newFilters.linked_to_kr === false) next.set('krLink', 'not_linked');
      else next.delete('krLink');

      const archived = newFilters.archived_state ?? 'active';
      if (archived === 'active') next.delete('archived');
      else next.set('archived', archived);

      return next;
    }, { replace: true });
  }, [setSearch, setSearchParams]);

  const { data: projects, isLoading, error } = useProjects(filters);
  const { items: ganttItems, excludedCount: ganttExcluded } = useGanttData(projects, {
    statusFilter: filters.status,
  });
  const createProject = useCreateProject();
  const { canCreateProject } = useProjectPermissionsV2();

  const writerProfileId = realProfileId ?? profileId;

  const handleCreate = (values: any) => {
    if (!writerProfileId || !currentBuId) return;
    createProject.mutate({
      name: values.name,
      description: values.description || null,
      owner_id: values.owner_id,
      status: values.status,
      start_date: values.start_date,
      due_date: values.due_date,
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
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="projects" />
              {canCreateProject && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo projeto
                </Button>
              )}
            </div>
          }
        />

        {/* Filters */}
        <ProjectFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

        {/* View options */}
        <ViewOptionsBar
          resultCount={projects?.length}
          resultCountLabel="projetos encontrados"
          resultCountLabelSingular="projeto encontrado"
        >
          <ProjectViewToggle
            viewMode={viewState.value}
            onViewModeChange={viewState.set}
          />
        </ViewOptionsBar>

        {/* Status Summary */}
        {!isLoading && !error && projects && projects.length > 0 && (
          <ProjectStatusSummary projects={projects} />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar projetos.</p>
          </div>
        ) : viewState.value === 'gantt' ? (
          <ProjectGanttChart items={ganttItems} excludedCount={ganttExcluded} />
        ) : projects && projects.length > 0 ? (
          <ProjectsTable projects={projects} />
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
