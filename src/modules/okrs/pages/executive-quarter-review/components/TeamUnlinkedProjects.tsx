import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { quarterReviewKeys } from '@/lib/queryKeys/okrs';
import { useProjectsForWizard } from '@/modules/projects/hooks';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';

interface Props {
  teamId: string;
  krIds: string[];
}

export const TeamUnlinkedProjects = memo(function TeamUnlinkedProjects({
  teamId,
  krIds,
}: Props) {
  const supabase = useBuScopedSupabase();
  const { data: projects } = useProjectsForWizard(teamId);

  const { data: linkedProjectIds } = useQuery({
    queryKey: quarterReviewKeys.linkedProjectIds(teamId, krIds),
    queryFn: async () => {
      if (!krIds.length) return [] as string[];
      const { data, error } = await supabase
        .from('project_krs')
        .select('project_id')
        .in('key_result_id', krIds);
      if (error) throw error;
      return [...new Set((data || []).map((r: any) => r.project_id))] as string[];
    },
    enabled: krIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const unlinkedProjects = useMemo(() => {
    if (!projects?.length) return [];
    const linked = new Set(linkedProjectIds || []);
    return projects.filter((p) => !linked.has(p.id));
  }, [projects, linkedProjectIds]);

  if (!unlinkedProjects.length) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Projetos sem OKR</p>
      <div className="space-y-2">
        {unlinkedProjects.slice(0, 5).map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-2">
            <span className="text-sm truncate">{project.name}</span>
            <div className="flex items-center gap-2">
              <ProjectHealthBadge health={project.health} />
              <span className="text-xs text-muted-foreground">
                {Math.round(project.completion_pct)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
