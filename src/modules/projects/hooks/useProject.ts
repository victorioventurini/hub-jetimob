import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '../utils/projectHealth';
import type { ProjectWithRelations } from '../types';

const PROJECT_DETAIL_FIELDS = `
  id, name, description, status, start_date, due_date,
  external_url, owner_id, bu_id, created_at, updated_at,
  owner:profiles!projects_owner_id_fkey(id, display_name, photo_url),
  project_teams(team_id, teams:teams!project_teams_team_id_fkey(id, name)),
  project_krs(key_result_id, impact, kr:okr_team_key_results!project_krs_key_result_id_fkey(id, title)),
  project_milestones(id, project_id, name, owner_id, status, due_date, sort_order, bu_id, created_at, updated_at, deleted_at)
` as const;

export function useProject(projectId: string | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.detail(projectId || ''),
    queryFn: async () => {
      if (!supabase || !projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_DETAIL_FIELDS)
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Post-fetch BU validation
      if (buId && data.bu_id !== buId) return null;

      const milestones = (data.project_milestones || []).filter((m: any) => !m.deleted_at);
      const completion = computeCompletion(data.project_milestones || []);
      const health = computeHealth(data.project_milestones || []);

      const teams = (data.project_teams || []).map((pt: any) => ({
        team_id: pt.team_id,
        team_name: pt.teams?.name ?? '',
      }));

      const krs = (data.project_krs || []).map((pk: any) => ({
        key_result_id: pk.key_result_id,
        kr_title: pk.kr?.title ?? '',
        impact: pk.impact,
      }));

      return {
        ...data,
        deleted_at: null,
        owner: data.owner ?? null,
        teams,
        krs,
        milestones,
        health,
        milestones_total: completion.total,
        milestones_done: completion.done,
        completion_pct: completion.pct,
      } as ProjectWithRelations;
    },
    enabled: isReady && !!supabase && !!projectId,
  });
}
