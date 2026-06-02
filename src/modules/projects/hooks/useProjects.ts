import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth, computeCompletion } from '../utils/projectHealth';
import type { ProjectFilters, ProjectWithRelations } from '../types';

const PROJECT_LIST_FIELDS = `
  id, name, description, status, start_date, due_date,
  external_url, owner_id, bu_id, created_at, updated_at,
  owner:profiles!projects_owner_id_fkey(id, display_name, photo_url),
  project_teams(team_id, teams:teams!project_teams_team_id_fkey(id, name)),
  project_krs(key_result_id, impact, kr:okr_team_key_results!project_krs_key_result_id_fkey(id, title)),
  project_milestones(id, name, status, start_date, due_date, created_at, deleted_at)
` as const;

export function useProjects(filters: ProjectFilters = {}) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const archivedState = filters.archived_state ?? 'active';

  return useQuery({
    queryKey: projectsKeys.list(buId, filters),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      // ── Active branch (canonical SELECT — preserves existing behavior) ──
      const fetchActive = async () => {
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

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as any[];
      };

      // ── Archived branch (RPC SECURITY DEFINER, v1.1 retorna jsonb com joins) ──
      const fetchArchived = async () => {
        const { data, error } = await supabase.rpc('list_archived_projects');
        if (error) throw error;
        // v1.1: RPC retorna jsonb (array) com owner/project_teams/project_krs/project_milestones aninhados,
        // mesma forma do branch ativo (PROJECT_LIST_FIELDS). Filtros client-side de status/owner permanecem
        // por consistência com o comportamento anterior (a RPC não aceita parâmetros).
        let rows = (Array.isArray(data) ? data : []) as any[];
        if (filters.status && filters.status !== 'all') {
          rows = rows.filter((p) => p.status === filters.status);
        }
        if (filters.owner_id) {
          rows = rows.filter((p) => p.owner_id === filters.owner_id);
        }
        return rows;
      };

      const rawData =
        archivedState === 'active'
          ? await fetchActive()
          : archivedState === 'archived'
            ? await fetchArchived()
            : (await Promise.all([fetchActive(), fetchArchived()]))
                .flat()
                // Dedup defensivo: um projeto recém-arquivado pode aparecer em ambas as branches
                // por timing entre soft-delete e cache da RPC.
                .reduce<any[]>((acc, p) => {
                  if (!acc.some((x) => x.id === p.id)) acc.push(p);
                  return acc;
                }, []);

      // Resolve team filter to include descendant subteams (canonical pattern,
      // ver mem://standards/users/team-filter-includes-subteams).
      let teamIdsFilter: Set<string> | null = null;
      if (filters.team_id) {
        const { data: allTeams, error: teamsErr } = await supabase
          .from('teams')
          .select('id, parent_team_id')
          .eq('bu_id', buId)
          .is('deleted_at', null);
        if (teamsErr) throw teamsErr;

        const childrenByParent = new Map<string, string[]>();
        (allTeams ?? []).forEach((t) => {
          if (!t.parent_team_id) return;
          const arr = childrenByParent.get(t.parent_team_id) ?? [];
          arr.push(t.id);
          childrenByParent.set(t.parent_team_id, arr);
        });

        const collected = new Set<string>([filters.team_id]);
        const stack = [filters.team_id];
        while (stack.length) {
          const cur = stack.pop()!;
          for (const c of childrenByParent.get(cur) ?? []) {
            if (!collected.has(c)) {
              collected.add(c);
              stack.push(c);
            }
          }
        }
        teamIdsFilter = collected;
      }

      let results = (rawData || []).map((p: any) => {
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

        const isArchived = p.deleted_at != null;

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
          deleted_at: p.deleted_at ?? null,
          owner: p.owner ?? null,
          teams,
          krs,
          milestones,
          health,
          milestones_total: completion.total,
          milestones_done: completion.done,
          completion_pct: completion.pct,
          is_archived: isArchived,
        } as ProjectWithRelations;
      });

      // Client-side filters (PostgREST can't filter parent by nested relations)

      // Text search: project name OR milestone name
      if (filters.search) {
        const term = filters.search.toLowerCase();
        results = results.filter((p) => {
          if (p.name.toLowerCase().includes(term)) return true;
          return p.milestones.some((m: any) =>
            m.name && m.name.toLowerCase().includes(term)
          );
        });
      }

      // Team filter (inclui descendentes — ver mem://standards/users/team-filter-includes-subteams)
      if (teamIdsFilter) {
        results = results.filter((p) =>
          p.teams.some((t) => teamIdsFilter!.has(t.team_id))
        );
      }

      // KR link filter
      if (filters.linked_to_kr === true) {
        results = results.filter((p) => p.krs.length > 0);
      } else if (filters.linked_to_kr === false) {
        results = results.filter((p) => p.krs.length === 0);
      }

      // Health filter (computed client-side via computeHealth above)
      if (filters.health && filters.health !== 'all') {
        results = results.filter((p) => p.health === filters.health);
      }

      return results;
    },
    enabled: isReady && !!supabase && !!buId,
  });
}
