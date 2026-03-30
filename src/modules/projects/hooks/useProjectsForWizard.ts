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
          project_milestones(id, name, status, due_date, owner_id, notes, deleted_at),
          project_teams!inner(team_id)
        `)
        .eq('bu_id', buId)
        .eq('project_teams.team_id', teamId)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((p: any) => {
        const allMilestones = (p.project_milestones || []).filter(
          (m: any) => !m.deleted_at
        );
        const completion = computeCompletion(allMilestones);

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          due_date: p.due_date,
          external_url: p.external_url,
          health: computeHealth(allMilestones),
          milestones_total: completion.total,
          milestones_done: completion.done,
          completion_pct: completion.pct,
          milestones: allMilestones.map((m: any) => ({
            id: m.id,
            name: m.name,
            status: m.status,
            due_date: m.due_date,
            owner_id: m.owner_id,
            notes: m.notes,
          })),
        } as ProjectForWizard;
      });
    },
    enabled: isReady && !!supabase && !!buId && !!teamId,
  });
}
