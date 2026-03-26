import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '../utils/projectHealth';
import type { ProjectForWizard, ProjectImpact } from '../types';

export interface ProjectForKr extends ProjectForWizard {
  impact: ProjectImpact;
}

/**
 * Returns projects linked to a specific KR.
 */
export function useProjectsForKr(krId: string | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.byKr(krId || ''),
    queryFn: async () => {
      if (!supabase || !krId || !buId) return [];

      const { data, error } = await supabase
        .from('project_krs')
        .select(`
          impact,
          project:projects!project_krs_project_id_fkey(
            id, name, status, due_date, external_url, bu_id,
            project_milestones(id, status, due_date, deleted_at)
          )
        `)
        .eq('key_result_id', krId);

      if (error) throw error;

      return (data || [])
        .filter((row: any) => row.project && row.project.bu_id === buId)
        .map((row: any) => {
          const milestones = row.project.project_milestones || [];
          const completion = computeCompletion(milestones);

          return {
            id: row.project.id,
            name: row.project.name,
            status: row.project.status,
            due_date: row.project.due_date,
            external_url: row.project.external_url,
            health: computeHealth(milestones),
            milestones_total: completion.total,
            milestones_done: completion.done,
            completion_pct: completion.pct,
            impact: row.impact,
          } as ProjectForKr;
        });
    },
    enabled: isReady && !!supabase && !!krId && !!buId,
  });
}
