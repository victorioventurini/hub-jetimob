import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '../utils/projectHealth';
import type { ProjectFilters, ProjectWithRelations, ProjectHealth } from '../types';

const PROJECT_LIST_FIELDS = `
  id, name, description, status, start_date, due_date,
  external_url, owner_id, bu_id, created_at, updated_at,
  owner:profiles!projects_owner_id_fkey(id, display_name, photo_url),
  project_teams(team_id, teams:teams!project_teams_team_id_fkey(id, name)),
  project_krs(key_result_id, impact, kr:okr_team_key_results!project_krs_key_result_id_fkey(id, title)),
  project_milestones(id, status, due_date, deleted_at)
` as const;

export function useProjects(filters: ProjectFilters = {}) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.list(buId, filters),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      let query = supabase
        .from('projects')
        .select(PROJECT_LIST_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => {
        const milestones = p.project_milestones || [];
        const completion = computeCompletion(milestones);
        const health = computeHealth(milestones);

        const teams = (p.project_teams || []).map((pt: any) => ({
          team_id: pt.team_id,
          team_name: pt.teams?.name ?? '',
        }));

        const krs = (p.project_krs || []).map((pk: any) => ({
          key_result_id: pk.key_result_id,
          kr_title: pk.kr?.title ?? '',
          impact: pk.impact,
        }));

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          start_date: p.start_date,
          due_date: p.due_date,
          external_url: p.external_url,
          owner_id: p.owner_id,
          bu_id: p.bu_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
          deleted_at: null,
          owner: p.owner ?? null,
          teams,
          krs,
          milestones,
          health,
          milestones_total: completion.total,
          milestones_done: completion.done,
          completion_pct: completion.pct,
        } as ProjectWithRelations;
      });
    },
    enabled: isReady && !!supabase && !!buId,
  });
}
