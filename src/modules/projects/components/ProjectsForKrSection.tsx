/**
 * ProjectsForKrSection - Projetos vinculados a um KR
 * 
 * Exibido abaixo de InitiativesSummary na visão de detalhe do KR.
 * Suporta modo read-only e edição (vincular/desvincular).
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExternalLink, FolderKanban, Plus, Search, X } from 'lucide-react';
import { useProjectsForKr, type ProjectForKr } from '../hooks/useProjectsForKr';
import { useProjectsForLinking } from '../hooks/useProjectsForLinking';
import { useAddProjectKrLink, useRemoveProjectKrLink } from '../hooks/useProjectKrLinks';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectImpact } from '../types';

interface ProjectsForKrSectionProps {
  krId: string;
  canEdit?: boolean;
  className?: string;
}

const impactLabel: Record<string, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export function ProjectsForKrSection({ krId, canEdit = false, className }: ProjectsForKrSectionProps) {
  const { data: projects, isLoading } = useProjectsForKr(krId);
  const { data: availableProjects = [], isLoading: loadingProjects } = useProjectsForLinking();
  const addLink = useAddProjectKrLink();
  const removeLink = useRemoveProjectKrLink();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ProjectImpact>('medium');

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  const linkedIds = new Set((projects ?? []).map((p) => p.id));
  const filteredProjects = availableProjects.filter(
    (p) => !linkedIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = () => {
    if (!selectedProjectId) return;
    addLink.mutate(
      { project_id: selectedProjectId, key_result_id: krId, impact: selectedImpact },
      {
        onSuccess: () => {
          setSelectedProjectId(null);
          setSelectedImpact('medium');
          setPopoverOpen(false);
          setSearch('');
        },
      },
    );
  };

  const handleRemove = (projectId: string) => {
    removeLink.mutate({ project_id: projectId, key_result_id: krId });
  };

  if (!canEdit && (!projects || projects.length === 0)) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Projetos vinculados</span>
          {projects && projects.length > 0 && (
            <Badge variant="outline" className="text-xs">{projects.length}</Badge>
          )}
        </div>

        {canEdit && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Vincular Projeto
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar projeto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {loadingProjects && <p className="text-xs text-muted-foreground p-2">Carregando...</p>}
                  {!loadingProjects && filteredProjects.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Nenhum projeto disponível</p>
                  )}
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                        selectedProjectId === p.id ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="line-clamp-1">{p.name}</span>
                    </button>
                  ))}
                </div>

                {selectedProjectId && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Select
                      value={selectedImpact}
                      onValueChange={(v) => setSelectedImpact(v as ProjectImpact)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alto</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="low">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleAdd}
                      disabled={addLink.isPending}
                    >
                      Vincular
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {(!projects || projects.length === 0) ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto vinculado</p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ProjectHealthBadge health={project.health} />
                  <span className="text-sm font-medium truncate">{project.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {project.due_date && (
                    <span className="text-xs text-muted-foreground">
                      até {format(parseISO(project.due_date), "dd MMM", { locale: ptBR })}
                    </span>
                  )}
                  {project.external_url && (
                    <a
                      href={project.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemove(project.id)}
                      disabled={removeLink.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <ProjectProgressBar
                  total={project.milestones_total}
                  done={project.milestones_done}
                  pct={project.completion_pct}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  Impacto: {impactLabel[project.impact] ?? project.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
