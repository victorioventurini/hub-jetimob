/**
 * useUserKrsForWizard - Hook para buscar KRs atribuídos ao usuário atual para o Wizard Colaborador
 * 
 * Busca KRs onde o usuário é:
 * - Owner da KR
 * - Co-responsável da KR
 * - Owner de pelo menos uma iniciativa vinculada à KR
 * 
 * Filtra por ciclo ativo, calcula progresso e identifica pendências.
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { differenceInDays, parseISO } from "date-fns";
import type { WizardKr, WizardKrFilter } from "./useTeamPendingKrs";

// ============================================================
// HOOK
// ============================================================

export function useUserKrsForWizard(
  cycleId: string | null | undefined,
  filter: WizardKrFilter = 'all',
  userProfileId?: string | null
) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profile } = useAuth();

  // Domain IDs here are profile IDs (profiles.id)
  const effectiveUserId = userProfileId ?? profile?.id ?? null;

  return useQuery({
    queryKey: queryKeys.okrs.wizardUserKrs(currentBuId, cycleId ?? null, effectiveUserId, filter),
    queryFn: async (): Promise<WizardKr[]> => {
      if (!cycleId || !effectiveUserId) return [];

      // First, fetch KR IDs where user owns initiatives
      const { data: initiativeKrIds } = await supabase
        .from('okr_initiatives')
        .select('kr_id')
        .eq('owner_user_id', effectiveUserId)
        .is('deleted_at', null);

      const krIdsFromInitiatives = [...new Set((initiativeKrIds || []).map(i => i.kr_id).filter(Boolean))];

      // Fetch KRs where user is owner, co-responsible, or has initiatives
      let query = supabase
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
          created_at,
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
        .is('deleted_at', null);

      // Build OR condition: owner OR co-responsible OR has initiatives
      const conditions = [
        `owner_user_id.eq.${effectiveUserId}`,
        `co_responsibles.cs.{${effectiveUserId}}`
      ];
      
      if (krIdsFromInitiatives.length > 0) {
        conditions.push(`id.in.(${krIdsFromInitiatives.join(',')})`);
      }
      
      query = query.or(conditions.join(','));
      query = query.order('status', { ascending: false });
      query = query.order('last_checkin_at', { ascending: true, nullsFirst: true });

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();
      const PENDING_THRESHOLD_DAYS = 7;

      // Batch fetch all owner profiles to avoid N+1
      const ownerIds = [...new Set((data || [])
        .map(kr => kr.owner_user_id)
        .filter((id): id is string => !!id)
      )];
      
      let ownerMap = new Map<string, { display_name: string | null; photo_url: string | null }>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .in('id', ownerIds);
        
        ownerMap = new Map((owners || []).map(o => [o.id, { display_name: o.display_name, photo_url: o.photo_url }]));
      }

      // Transform data (no more N+1)
      const krs: WizardKr[] = (data || []).map((kr) => {
        const objective = kr.team_objective as any;
        const team = objective?.team as any;

        // Calculate days since last check-in (fallback to created_at if never checked in)
        const referenceDate = kr.last_checkin_at || kr.created_at;
        const daysSinceCheckin = referenceDate
          ? differenceInDays(now, parseISO(referenceDate))
          : 0;

        const isPending = daysSinceCheckin > PENDING_THRESHOLD_DAYS;
        const isAtRisk = kr.status === 'yellow' || kr.status === 'red';

        // Calculate progress
        const range = kr.target - kr.baseline;
        const progress = range !== 0
          ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / range) * 100))
          : 0;

        // Get owner info from batch lookup
        const owner = kr.owner_user_id ? ownerMap.get(kr.owner_user_id) : null;

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
          owner_name: owner?.display_name || null,
          owner_photo: owner?.photo_url || null,
          team_id: team?.id || '',
          team_name: team?.name || '',
          objective_id: objective?.id || '',
          objective_title: objective?.title || '',
          is_pending: isPending,
          is_at_risk: isAtRisk,
          progress,
        };
      });

      // Apply filter
      if (filter === 'pending') {
        return krs.filter(kr => kr.is_pending);
      }
      if (filter === 'at_risk') {
        return krs.filter(kr => kr.is_at_risk);
      }
      return krs;
    },
    enabled: !!cycleId && !!currentBuId && !!effectiveUserId,
    staleTime: 1 * 60 * 1000,
  });
}

