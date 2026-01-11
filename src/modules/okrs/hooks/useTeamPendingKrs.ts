/**
 * useTeamPendingKrs - Hook para buscar KRs pendentes/em risco do time para o wizard de check-in
 * 
 * Retorna KRs do time (+ descendentes se líder) que:
 * - Não têm check-in há mais de 7 dias (pendentes)
 * - Estão em risco (yellow/red)
 * 
 * RBAC: Usa get_okr_manageable_team_ids para escopo
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { differenceInDays, parseISO } from "date-fns";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================
// TYPES
// ============================================================

export interface WizardKr {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: 'up' | 'down';
  status: 'green' | 'yellow' | 'red' | 'not_started';
  last_checkin_at: string | null;
  days_since_checkin: number;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_photo: string | null;
  team_id: string;
  team_name: string;
  objective_id: string;
  objective_title: string;
  is_pending: boolean;
  is_at_risk: boolean;
  progress: number;
}

export type WizardKrFilter = 'pending' | 'at_risk' | 'all';

// ============================================================
// HOOK
// ============================================================

export function useTeamPendingKrs(
  cycleId: string | null | undefined,
  teamIds: string[],
  filter: WizardKrFilter = 'all'
) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: queryKeys.okrs.wizardTeamKrs(currentBuId, cycleId ?? null, teamIds, filter),
    queryFn: async (): Promise<WizardKr[]> => {
      if (!cycleId || teamIds.length === 0) return [];

      // Fetch KRs from team objectives in the selected cycle
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select(`
          id,
          title,
          baseline,
          current_value,
          target,
          unit,
          direction,
          status,
          last_checkin_at,
          owner_user_id,
          team_objective:okr_team_objectives!inner (
            id,
            title,
            cycle_id,
            team_id,
            team:teams (
              id,
              name
            )
          )
        `)
        .in('team_objective.team_id', teamIds)
        .eq('team_objective.cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null)
        .order('status', { ascending: false }) // red first, then yellow, then green
        .order('last_checkin_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const now = new Date();
      const PENDING_THRESHOLD_DAYS = 7;

      // Transform and enrich data
      const krs: WizardKr[] = await Promise.all((data || []).map(async (kr) => {
        const objective = kr.team_objective as any;
        const team = objective?.team as any;

        // Calculate days since last check-in
        const daysSinceCheckin = kr.last_checkin_at
          ? differenceInDays(now, parseISO(kr.last_checkin_at))
          : 999;

        const isPending = daysSinceCheckin > PENDING_THRESHOLD_DAYS;
        const isAtRisk = kr.status === 'yellow' || kr.status === 'red';

        // Calculate progress
        const range = kr.target - kr.baseline;
        const progress = range !== 0
          ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / range) * 100))
          : 0;

        // Fetch owner info if exists
        let ownerName = null;
        let ownerPhoto = null;
        if (kr.owner_user_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('display_name, photo_url')
            .eq('id', kr.owner_user_id)
            .maybeSingle();
          if (ownerData) {
            ownerName = ownerData.display_name;
            ownerPhoto = ownerData.photo_url;
          }
        }

        return {
          id: kr.id,
          title: kr.title,
          baseline: kr.baseline,
          current_value: kr.current_value,
          target: kr.target,
          unit: kr.unit || '',
          direction: kr.direction as 'up' | 'down',
          status: kr.status as WizardKr['status'],
          last_checkin_at: kr.last_checkin_at,
          days_since_checkin: daysSinceCheckin,
          owner_user_id: kr.owner_user_id,
          owner_name: ownerName,
          owner_photo: ownerPhoto,
          team_id: team?.id || '',
          team_name: team?.name || '',
          objective_id: objective?.id || '',
          objective_title: objective?.title || '',
          is_pending: isPending,
          is_at_risk: isAtRisk,
          progress,
        };
      }));

      // Apply filter
      if (filter === 'pending') {
        return krs.filter(kr => kr.is_pending);
      }
      if (filter === 'at_risk') {
        return krs.filter(kr => kr.is_at_risk);
      }
      return krs;
    },
    enabled: !!cycleId && !!currentBuId && teamIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================
// HELPER: Count by filter
// ============================================================

export function countKrsByFilter(krs: WizardKr[]) {
  return {
    pending: krs.filter(kr => kr.is_pending).length,
    atRisk: krs.filter(kr => kr.is_at_risk).length,
    all: krs.length,
  };
}
