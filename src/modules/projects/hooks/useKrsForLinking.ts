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
 * Regras de ciclo (canônicas, divergem por tipo de OKR):
 * - **Team KRs**: filtra por `objective.cycle_id ∈ ciclos ativos` (quarter + year).
 * - **Org KRs**: filtra por `objective.year ∈ anos ativos` (Org Objectives no schema
 *   atual usam coluna `year` e raramente preenchem `cycle_id`). Aceita também
 *   `cycle_id` como fallback de compatibilidade futura.
 *
 * Outras regras:
 * - Inclui apenas KRs do BU atual.
 * - Exclui KR com `deleted_at` ou `cancelled_at` preenchidos.
 * - Exclui KR cujo objetivo pai esteja em `status='draft'`/`'cancelled'` ou com soft-delete/cancel.
 *
 * Veja `mem://features/projects/kr-linking-standard` + `mem://features/okrs/draft-okr-governance`.
 */
export function useKrsForLinking() {
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();
  const { activeCycles, isLoading: cyclesLoading } = useActiveCycle();

  // Ciclos ativos (quarter + year) para Team KRs (via cycle_id)
  const cycleIds = (activeCycles ?? [])
    .filter((c) => c.type === 'quarter' || c.type === 'year')
    .map((c) => c.id);

  // Anos ativos para Org KRs (via objective.year)
  const activeYears = (activeCycles ?? [])
    .filter((c) => c.type === 'year')
    .map((c) => {
      // cycle.name canonical = "2026"; fallback para start_date
      const fromName = parseInt(c.name, 10);
      if (Number.isFinite(fromName)) return fromName;
      return c.start_date ? new Date(c.start_date).getUTCFullYear() : null;
    })
    .filter((y): y is number => y !== null);

  return useQuery({
    queryKey: [...projectsKeys.krsForLinking(currentBuId), cycleIds, activeYears] as const,
    enabled: !!supabase && !!currentBuId && !cyclesLoading,
    queryFn: async (): Promise<KrForLinking[]> => {
      if (!supabase || !currentBuId) return [];
      if (cycleIds.length === 0 && activeYears.length === 0) return [];

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
               id, title, status, year, cycle_id, deleted_at, cancelled_at,
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
      const yearSet = new Set(activeYears);

      const isObjectiveCommonValid = (obj: any) =>
        !!obj
        && obj.status !== 'draft'
        && obj.status !== 'cancelled'
        && !obj.deleted_at
        && !obj.cancelled_at;

      // Team: SEMPRE via cycle_id
      const isTeamObjectiveActive = (obj: any) =>
        isObjectiveCommonValid(obj) && !!obj.cycle_id && cycleSet.has(obj.cycle_id);

      // Org: via year (canonical) OU cycle_id (fallback de compatibilidade)
      const isOrgObjectiveActive = (obj: any) =>
        isObjectiveCommonValid(obj)
        && (
          (typeof obj.year === 'number' && yearSet.has(obj.year))
          || (!!obj.cycle_id && cycleSet.has(obj.cycle_id))
        );

      const team: KrForLinking[] = (teamRes.data ?? [])
        .filter((kr: any) => isTeamObjectiveActive(kr.objective))
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
        .filter((kr: any) => isOrgObjectiveActive(kr.objective))
        .map((kr: any) => ({
          id: kr.id,
          title: kr.title,
          kind: 'org' as const,
          objective_id: kr.objective?.id ?? null,
          objective_title: kr.objective?.title ?? null,
          cycle_id: kr.objective?.cycle_id ?? null,
          cycle_name:
            kr.objective?.cycle?.name
            ?? (kr.objective?.year ? String(kr.objective.year) : null),
          status: kr.status,
        }));

      return [...org, ...team];
    },
  });
}
