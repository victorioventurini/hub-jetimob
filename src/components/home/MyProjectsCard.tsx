/**
 * MyProjectsCard - Bloco "Meus Projetos" para a Home
 *
 * Exibe até 4 projetos onde o usuário é owner,
 * com status in_progress ou at_risk, ordenados por due_date.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useIdentity } from '@/hooks/useIdentity';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '@/modules/projects/utils/projectHealth';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MyProjectsCard() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const { profileId } = useIdentity();

  const { data: projects, isLoading } = useQuery({
    queryKey: projectsKeys.myProjects(buId, profileId),
    queryFn: async () => {
      if (!supabase || !buId || !profileId) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, due_date, external_url,
          project_milestones(id, status, due_date, deleted_at)
        `)
        .eq('bu_id', buId)
        .eq('owner_id', profileId)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(4);

      if (error) throw error;

      return (data || []).map((p: any) => {
        const milestones = p.project_milestones || [];
        const completion = computeCompletion(milestones);
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          due_date: p.due_date,
          health: computeHealth(milestones),
          milestones_total: completion.total,
          milestones_done: completion.done,
          completion_pct: completion.pct,
        };
      });
    },
    enabled: isReady && !!supabase && !!buId && !!profileId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </CardContent>
      </Card>
    );
  }

  if (!projects || projects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Meus Projetos
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects">
              Ver todos
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block rounded-lg border p-3 space-y-1.5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{project.name}</span>
              <ProjectHealthBadge health={project.health} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <ProjectProgressBar
                total={project.milestones_total}
                done={project.milestones_done}
                pct={project.completion_pct}
                className="flex-1"
              />
              {project.due_date && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(parseISO(project.due_date), "dd MMM", { locale: ptBR })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
