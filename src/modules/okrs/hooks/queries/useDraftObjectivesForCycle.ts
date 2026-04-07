/**
 * useDraftObjectivesForCycle — Busca objetivos de time com status 'draft'
 * para um ciclo específico (criados no QBR-pre).
 * 
 * Usado para hidratar o wizard de criação de OKRs com rascunhos existentes.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface DraftObjectiveKr {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: string;
  type: string | null;
  owner_user_id: string | null;
  linked_org_kr_id: string | null;
}

export interface DraftObjective {
  id: string;
  title: string;
  description: string | null;
  org_objective_id: string | null;
  team_id: string;
  cycle_id: string;
  keyResults: DraftObjectiveKr[];
}

// ============================================================
// FIELDS (explicit, no select('*'))
// ============================================================

const DRAFT_OBJECTIVE_FIELDS = `
  id, title, description, org_objective_id, team_id, cycle_id,
  key_results:okr_team_key_results(
    id, title, baseline, current_value, target, unit, direction, type,
    owner_user_id, linked_org_kr_id
  )
` as const;

// ============================================================
// HOOK
// ============================================================

export function useDraftObjectivesForCycle(
  teamId: string | null | undefined,
  cycleId: string | null | undefined,
) {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: queryKeys.okrs.draftObjectives(teamId ?? '', cycleId ?? ''),
    queryFn: async (): Promise<DraftObjective[]> => {
      if (!supabase || !teamId || !cycleId) return [];

      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select(DRAFT_OBJECTIVE_FIELDS)
        .eq('team_id', teamId)
        .eq('cycle_id', cycleId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((obj: any) => ({
        id: obj.id,
        title: obj.title,
        description: obj.description,
        org_objective_id: obj.org_objective_id,
        team_id: obj.team_id,
        cycle_id: obj.cycle_id,
        keyResults: (obj.key_results || [])
          .filter((kr: any) => !kr.deleted_at && !kr.cancelled_at)
          .map((kr: any) => ({
            id: kr.id,
            title: kr.title,
            baseline: kr.baseline ?? 0,
            current_value: kr.current_value ?? 0,
            target: kr.target ?? 100,
            unit: kr.unit ?? '%',
            direction: kr.direction ?? 'increase',
            type: kr.type,
            owner_user_id: kr.owner_user_id,
            linked_org_kr_id: kr.linked_org_kr_id,
          })),
      }));
    },
    enabled: isReady && !!supabase && !!buId && !!teamId && !!cycleId,
    staleTime: 2 * 60 * 1000,
  });
}
