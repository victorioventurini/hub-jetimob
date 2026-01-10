/**
 * useUserKrsForWizard - Hook para buscar KRs atribuídos ao usuário atual para o Wizard Colaborador
 * 
 * Busca KRs onde o usuário é owner ou co-responsável:
 * - Filtra por ciclo ativo
 * - Calcula progresso e status
 * - Identifica pendências
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays, parseISO } from "date-fns";
import type { WizardKr, WizardKrFilter } from "./useTeamPendingKrs";

// ============================================================
// HOOK
// ============================================================

export function useUserKrsForWizard(
  cycleId: string | null | undefined,
  filter: WizardKrFilter = 'all'
) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ['okr-wizard-user-krs', currentBuId, cycleId, userId, filter],
    queryFn: async (): Promise<WizardKr[]> => {
      if (!cycleId || !userId) return [];

      // Fetch KRs where user is owner or co-responsible
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
          co_responsibles,
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
        .eq('team_objective.cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('status', { ascending: false })
        .order('last_checkin_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const now = new Date();
      const PENDING_THRESHOLD_DAYS = 7;

      // Transform data
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

        // Fetch owner info
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
    enabled: !!cycleId && !!currentBuId && !!userId,
    staleTime: 1 * 60 * 1000,
  });
}
