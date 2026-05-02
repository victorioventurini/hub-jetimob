/**
 * useSummaryLookups — Resolução de nomes (read-only) para o Summary do
 * Check-in Individual.
 *
 * - BU-scoped (currentBuId síncrono).
 * - Colunas explícitas (sem select('*')).
 * - Soft delete: project_milestones e okr_initiatives só têm `deleted_at`.
 * - Hooks são `enabled` apenas quando a lista de IDs não está vazia.
 *
 * Padrão alinhado a:
 *   mem://standards/soft-delete-policy-v1
 *   mem://standards/query-optimization-standard
 *   mem://standards/bu-isolation-master
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import type { MilestoneStatus } from '@/modules/projects/types';

export interface MilestoneLookup {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: MilestoneStatus;
}

export interface InitiativeLookup {
  id: string;
  name: string;
  krId: string | null;
}

/**
 * Resolve nomes de milestones (e seus projetos) por IDs.
 * Retorna mapa { [milestoneId]: MilestoneLookup }.
 */
export function useMilestoneLookupByIds(milestoneIds: string[]) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  const sortedIds = [...new Set(milestoneIds)].sort();
  const enabled = !!buSupabase && !!currentBu?.id && sortedIds.length > 0;

  return useQuery<Record<string, MilestoneLookup>>({
    queryKey: ['collaborator-summary', 'milestones-lookup', currentBu?.id ?? null, sortedIds],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!buSupabase || !currentBu?.id) return {};
      const { data, error } = await buSupabase
        .from('project_milestones')
        .select('id, name, status, project_id, projects!inner(id, name)')
        .eq('bu_id', currentBu.id)
        .in('id', sortedIds)
        .is('deleted_at', null);
      if (error) throw error;

      const map: Record<string, MilestoneLookup> = {};
      for (const m of (data ?? []) as Array<{
        id: string;
        name: string;
        status: MilestoneStatus;
        project_id: string;
        projects: { id: string; name: string } | { id: string; name: string }[] | null;
      }>) {
        const project = Array.isArray(m.projects) ? m.projects[0] : m.projects;
        map[m.id] = {
          id: m.id,
          name: m.name,
          status: m.status,
          projectId: m.project_id,
          projectName: project?.name ?? 'Projeto',
        };
      }
      return map;
    },
  });
}

/**
 * Resolve títulos de iniciativas por IDs.
 * Retorna mapa { [initiativeId]: InitiativeLookup }.
 */
export function useInitiativeLookupByIds(initiativeIds: string[]) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  const sortedIds = [...new Set(initiativeIds)].sort();
  const enabled = !!buSupabase && !!currentBu?.id && sortedIds.length > 0;

  return useQuery<Record<string, InitiativeLookup>>({
    queryKey: ['collaborator-summary', 'initiatives-lookup', currentBu?.id ?? null, sortedIds],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!buSupabase || !currentBu?.id) return {};
      const { data, error } = await buSupabase
        .from('okr_initiatives')
        .select('id, name, kr_id')
        .eq('bu_id', currentBu.id)
        .in('id', sortedIds)
        .is('deleted_at', null);
      if (error) throw error;

      const map: Record<string, InitiativeLookup> = {};
      for (const i of (data ?? []) as Array<{ id: string; name: string; kr_id: string | null }>) {
        map[i.id] = { id: i.id, name: i.name, krId: i.kr_id };
      }
      return map;
    },
  });
}
