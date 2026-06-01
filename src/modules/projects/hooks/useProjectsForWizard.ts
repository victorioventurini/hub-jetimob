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
          id, name, status, due_date, external_url, owner_id,
          owner:profiles!projects_owner_id_fkey(display_name, photo_url),
          project_milestones(id, name, status, start_date, due_date, owner_id, notes, deleted_at,
            milestone_owner:profiles!project_milestones_owner_id_fkey(display_name, photo_url)
          ),
          project_teams!inner(team_id, team:teams!project_teams_team_id_fkey(name))
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
        const owner = p.owner as any;

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
          owner_id: p.owner_id ?? null,
          owner_name: owner?.display_name ?? null,
          owner_photo_url: owner?.photo_url ?? null,
          teams: (p.project_teams || []).map((pt: any) => ({
            team_id: pt.team_id,
            team_name: (pt.team as any)?.name ?? 'Time',
          })),
          milestones: allMilestones.map((m: any) => ({
            id: m.id,
            name: m.name,
            status: m.status,
            start_date: m.start_date,
            due_date: m.due_date,
            owner_id: m.owner_id,
            owner_name: m.milestone_owner?.display_name ?? null,
            owner_photo_url: m.milestone_owner?.photo_url ?? null,
            notes: m.notes,
          })),
        } as ProjectForWizard;
      });
    },
    enabled: isReady && !!supabase && !!buId && !!teamId,
  });
}
