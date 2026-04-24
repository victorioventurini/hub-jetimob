import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { useActiveCycle } from '@/modules/okrs/hooks/useActiveCycle';

export type KrLinkKind = 'team' | 'org';

export interface KrForLinking {
  id: string;
  title: string;
  kind: KrLinkKind;
  objective_id: string | null;
  objective_title: string | null;
  cycle_id: string | null;
  cycle_name: string | null;
  status: string;
}

/**
 * Lista KRs disponíveis para vínculo a Projetos/Milestones.
 *
 * Regras:
 * - Inclui Team KRs e Org KRs do BU atual.
 * - Filtra por ciclo ativo: quarter ATIVO + year ATIVO (via objective.cycle_id).
 * - Exclui removidas (`deleted_at IS NULL`) e canceladas (`cancelled_at IS NULL`).
 *
 * Veja `mem://features/projects/kr-linking-standard`.
 */
export function useKrsForLinking() {
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();
  const { activeCycles, isLoading: cyclesLoading } = useActiveCycle();

  // Aceitar quarter + year ativos
  const cycleIds = (activeCycles ?? [])
    .filter((c) => c.type === 'quarter' || c.type === 'year')
    .map((c) => c.id);

  return useQuery({
    queryKey: [...projectsKeys.krsForLinking(currentBuId), cycleIds] as const,
    enabled: !!supabase && !!currentBuId && !cyclesLoading,
    queryFn: async (): Promise<KrForLinking[]> => {
      if (!supabase || !currentBuId || cycleIds.length === 0) return [];

      const [teamRes, orgRes] = await Promise.all([
        supabase
          .from('okr_team_key_results')
          .select(
            `id, title, status,
             objective:okr_team_objectives!okr_team_key_results_team_objective_id_fkey(
               id, title, status, cycle_id, deleted_at, cancelled_at,
               cycle:cycles!okr_team_objectives_cycle_id_fkey(id, name)
             )`,
          )
          .eq('bu_id', currentBuId)
          .is('deleted_at', null)
          .is('cancelled_at', null)
          .order('title'),
        supabase
          .from('okr_org_key_results')
          .select(
            `id, title, status,
             objective:okr_org_objectives!okr_org_key_results_org_objective_id_fkey(
               id, title, status, cycle_id, deleted_at, cancelled_at,
               cycle:cycles!okr_org_objectives_cycle_id_fkey(id, name)
             )`,
          )
          .eq('bu_id', currentBuId)
          .is('deleted_at', null)
          .is('cancelled_at', null)
          .order('title'),
      ]);

      if (teamRes.error) throw teamRes.error;
      if (orgRes.error) throw orgRes.error;

      const cycleSet = new Set(cycleIds);

      // Exclui KRs cujo objetivo pai esteja em draft/cancelled/deleted.
      // Ver `mem://features/projects/kr-linking-standard` + `mem://features/okrs/draft-okr-governance`.
      const isObjectiveActive = (obj: any) =>
        !!obj?.cycle_id
        && cycleSet.has(obj.cycle_id)
        && obj.status !== 'draft'
        && obj.status !== 'cancelled'
        && !obj.deleted_at
        && !obj.cancelled_at;

      const team: KrForLinking[] = (teamRes.data ?? [])
        .filter((kr: any) => isObjectiveActive(kr.objective))
        .map((kr: any) => ({
          id: kr.id,
          title: kr.title,
          kind: 'team' as const,
          objective_id: kr.objective?.id ?? null,
          objective_title: kr.objective?.title ?? null,
          cycle_id: kr.objective?.cycle_id ?? null,
          cycle_name: kr.objective?.cycle?.name ?? null,
          status: kr.status,
        }));

      const org: KrForLinking[] = (orgRes.data ?? [])
        .filter((kr: any) => isObjectiveActive(kr.objective))
        .map((kr: any) => ({
          id: kr.id,
          title: kr.title,
          kind: 'org' as const,
          objective_id: kr.objective?.id ?? null,
          objective_title: kr.objective?.title ?? null,
          cycle_id: kr.objective?.cycle_id ?? null,
          cycle_name: kr.objective?.cycle?.name ?? null,
          status: kr.status,
        }));

      return [...org, ...team];
    },
  });
}
