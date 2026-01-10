/**
 * useTeamOverviewMetrics - Hook para buscar métricas consolidadas do time para o Wizard do Líder
 * 
 * Retorna:
 * - Contagem de KRs por status de atualização
 * - KRs em risco/estagnados
 * - Iniciativas críticas
 * - Colaboradores que sinalizaram necessidade de ajuda
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { differenceInDays, parseISO } from "date-fns";
import type { LeaderOverviewMetrics, LeaderHighlight } from "@/modules/okrs/types/wizard";

// ============================================================
// HOOK
// ============================================================

export function useTeamOverviewMetrics(
  cycleId: string | null | undefined,
  teamIds: string | string[]
) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // Normalize to array
  const normalizedTeamIds = Array.isArray(teamIds) ? teamIds : teamIds ? [teamIds] : [];

  return useQuery({
    queryKey: ['okr-team-overview-metrics', currentBuId, cycleId, normalizedTeamIds],
    queryFn: async (): Promise<{
      metrics: LeaderOverviewMetrics;
      highlights: LeaderHighlight[];
    }> => {
      if (!cycleId || normalizedTeamIds.length === 0) {
        return {
          metrics: {
            totalKrs: 0,
            krsUpdatedOnTime: 0,
            krsUpdatedLate: 0,
            krsNoUpdate: 0,
            krsAtRisk: 0,
            krsStagnant: 0,
            initiativesCritical: 0,
            collaboratorsNeedingHelp: 0,
          },
          highlights: [],
        };
      }

      // Fetch KRs for the teams in the cycle
      const { data: krsData, error: krsError } = await supabase
        .from('okr_team_key_results')
        .select(`
          id,
          title,
          current_value,
          target,
          baseline,
          status,
          last_checkin_at,
          owner_user_id,
          team_objective:okr_team_objectives!inner (
            id,
            title,
            cycle_id,
            team_id,
            team:teams (id, name)
          )
        `)
        .in('team_objective.team_id', normalizedTeamIds)
        .eq('team_objective.cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null);

      if (krsError) throw krsError;

      const now = new Date();
      const PENDING_THRESHOLD = 7;
      const STAGNANT_THRESHOLD = 14;

      // Process KRs
      let krsUpdatedOnTime = 0;
      let krsUpdatedLate = 0;
      let krsNoUpdate = 0;
      let krsAtRisk = 0;
      let krsStagnant = 0;

      const highlights: LeaderHighlight[] = [];
      const stagnantKrs: typeof krsData = [];
      const overdueKrs: typeof krsData = [];

      for (const kr of krsData || []) {
        const daysSinceCheckin = kr.last_checkin_at
          ? differenceInDays(now, parseISO(kr.last_checkin_at))
          : 999;

        // Classification
        if (daysSinceCheckin === 999 || !kr.last_checkin_at) {
          krsNoUpdate++;
          overdueKrs.push(kr);
        } else if (daysSinceCheckin > PENDING_THRESHOLD) {
          krsUpdatedLate++;
          if (daysSinceCheckin <= STAGNANT_THRESHOLD) {
            overdueKrs.push(kr);
          }
        } else {
          krsUpdatedOnTime++;
        }

        // At risk (yellow/red status)
        if (kr.status === 'yellow' || kr.status === 'red') {
          krsAtRisk++;
        }

        // Stagnant (no progress for 14+ days)
        if (daysSinceCheckin >= STAGNANT_THRESHOLD) {
          krsStagnant++;
          stagnantKrs.push(kr);
        }
      }

      // Generate highlights for stagnant KRs (top 3)
      stagnantKrs.slice(0, 3).forEach((kr, idx) => {
        const objective = kr.team_objective as any;
        const daysSince = kr.last_checkin_at
          ? differenceInDays(now, parseISO(kr.last_checkin_at))
          : null;

        highlights.push({
          id: `stagnant-${kr.id}`,
          type: 'stagnant',
          title: kr.title,
          description: daysSince
            ? `Sem progresso há ${daysSince} dias`
            : 'Nunca atualizado',
          relatedKrId: kr.id,
          priority: daysSince && daysSince > 21 ? 'high' : 'medium',
        });
      });

      // Fetch blocked initiatives
      const { data: blockedInitiatives, error: initError } = await supabase
        .from('okr_initiatives')
        .select(`
          id,
          name,
          status,
          kr_id
        `)
        .eq('status', 'blocked')
        .is('deleted_at', null);

      // Filter initiatives by team (simplified - just count for now)
      const initiativesCritical = blockedInitiatives?.length || 0;

      // Add initiative highlights
      (blockedInitiatives || []).slice(0, 2).forEach((init: any) => {
        highlights.push({
          id: `initiative-${init.id}`,
          type: 'blocked',
          title: init.name,
          description: 'Iniciativa bloqueada',
          relatedInitiativeId: init.id,
          priority: 'high',
        });
      });

      // TODO: Fetch collaborators needing help from wizard sessions
      // For now, return 0
      const collaboratorsNeedingHelp = 0;

      return {
        metrics: {
          totalKrs: krsData?.length || 0,
          krsUpdatedOnTime,
          krsUpdatedLate,
          krsNoUpdate,
          krsAtRisk,
          krsStagnant,
          initiativesCritical,
          collaboratorsNeedingHelp,
        },
        highlights,
      };
    },
    enabled: !!cycleId && !!currentBuId && normalizedTeamIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
