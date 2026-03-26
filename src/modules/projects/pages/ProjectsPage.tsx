/**
 * ProjectsPage — /projects
 * 
 * Lista de projetos com filtros na URL e toggle lista/gantt.
 */

import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, GanttChart as GanttIcon } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useCreateProject } from '../hooks/useProjectMutations';
import { useProjectPermissionsV2 } from '../hooks/useProjectPermissionsV2';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFiltersBar } from '../components/ProjectFiltersBar';
import { ProjectDialog } from '../components/ProjectDialog';
import type { ProjectFilters } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profileId, realProfileId } = useIdentity();
  const { currentBuId } = useBu();
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters: ProjectFilters = {
    status: (searchParams.get('status') as ProjectFilters['status']) || 'all',
    search: searchParams.get('q') || undefined,
    owner_id: searchParams.get('owner') || undefined,
  };

  const handleFiltersChange = useCallback((newFilters: ProjectFilters) => {
    const params = new URLSearchParams();
    if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.search) params.set('q', newFilters.search);
    if (newFilters.owner_id) params.set('owner', newFilters.owner_id);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const { data: projects, isLoading, error } = useProjects(filters);
  const createProject = useCreateProject();
  const { canCreateProject } = useProjectPermissionsV2();

  const writerProfileId = realProfileId ?? profileId;

  const handleCreate = (values: any) => {
    if (!writerProfileId || !currentBuId) return;
    createProject.mutate({
      name: values.name,
      description: values.description || null,
      owner_id: writerProfileId,
      status: values.status,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
      external_url: values.external_url || null,
      bu_id: currentBuId,
    }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie projetos estratégicos e acompanhe milestones.
            </p>
          </div>
          {canCreateProject && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo projeto
            </Button>
          )}
        </div>

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
      />
    </HubLayout>
  );
}
