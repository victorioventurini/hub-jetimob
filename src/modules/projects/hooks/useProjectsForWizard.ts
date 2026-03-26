import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '../utils/projectHealth';
import type { ProjectForWizard } from '../types';

/**
 * Lightweight hook for wizard integration.
 * Returns active projects for a team without heavy joins.
 */
export function useProjectsForWizard(teamId: string | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.forWizard(buId, teamId || ''),
    queryFn: async () => {
      if (!supabase || !buId || !teamId) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, due_date, external_url,
          project_milestones(id, status, due_date, deleted_at),
          project_teams!inner(team_id)
        `)
        .eq('bu_id', buId)
        .eq('project_teams.team_id', teamId)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((p: any) => {
        const milestones = p.project_milestones || [];
        const completion = computeCompletion(milestones);

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          due_date: p.due_date,
          external_url: p.external_url,
          health: computeHealth(milestones),
          milestones_total: completion.total,
          milestones_done: completion.done,
          completion_pct: completion.pct,
        } as ProjectForWizard;
      });
    },
    enabled: isReady && !!supabase && !!buId && !!teamId,
  });
}
