/**
 * useCarryOverDecisions — devolve as decisões do rito anterior do mesmo
 * `wizard_type` que ainda não foram resolvidas.
 *
 * Para rituais de time (ex: team-checkin, mbr-pre, qbr-pre, weekly): filtra
 * pela última sessão completada do mesmo `wizard_type` + `team_id`.
 * Para rituais sem time (ex: mbr, weekly executivo): filtra apenas pelo
 * `wizard_type` na BU corrente.
 *
 * Para `collaborator` use o caminho dedicado (`useMyPendingDecisions`).
 */
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import { extractAllDecisions } from '../lib/extractDecisions';
import type { TeamCheckinDecision, WizardPersona } from '../types/wizard';

export interface UseCarryOverDecisionsParams {
  wizardType: WizardPersona;
  teamId?: string | null;
  /** Quando informado, considera somente sessões iniciadas pelo profile (ex: collaborator) */
  startedByProfileId?: string | null;
  enabled?: boolean;
}

export function useCarryOverDecisions({
  wizardType,
  teamId,
  startedByProfileId,
  enabled = true,
}: UseCarryOverDecisionsParams) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  return useQuery<TeamCheckinDecision[]>({
    queryKey: okrsKeys.carryOverDecisions(currentBu?.id ?? null, wizardType, teamId ?? null, startedByProfileId ?? null),
    queryFn: async (): Promise<TeamCheckinDecision[]> => {
      if (!buSupabase || !currentBu?.id) return [];

      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, wizard_type, completed_at, decisions, reflection_data, team_id, started_by')
        .eq('bu_id', currentBu.id)
        .eq('wizard_type', wizardType)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (teamId) query = query.eq('team_id', teamId);
      if (startedByProfileId) query = query.eq('started_by', startedByProfileId);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const all = extractAllDecisions(data[0] as { decisions?: unknown; reflection_data?: unknown });
      return all.filter((d) => (d as { followUpStatus?: string }).followUpStatus !== 'done');
    },
    enabled: enabled && !!buSupabase && !!currentBu?.id,
    staleTime: 2 * 60 * 1000,
  });
}
