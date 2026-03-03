/**
 * useRitualHistory - Hook para buscar sessões de wizard concluídas (histórico de rituais)
 * 
 * Suporta filtros por tipo de wizard, time e período.
 * Acesso: todos os usuários veem seus rituais; admins veem todos.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import type { WizardPersona, TeamCheckinDecision } from '../types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface RitualHistoryFilters {
  wizardType?: WizardPersona | 'all';
  teamId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface RitualHistoryItem {
  id: string;
  wizardType: WizardPersona;
  teamId: string | null;
  teamName: string | null;
  cycleId: string | null;
  cycleName: string | null;
  startedBy: string;
  startedByName: string | null;
  startedAt: string;
  completedAt: string | null;
  decisions: TeamCheckinDecision[];
  reflectionData: Record<string, unknown> | null;
}

export interface RitualDetail extends RitualHistoryItem {
  reflectionData: Record<string, unknown> | null;
}

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_TYPE_LABELS: Record<WizardPersona, string> = {
  'collaborator': 'Check-in Colaborador',
  'leader-prep': 'Preparação do Líder',
  'team-checkin': 'Check-in do Time',
  'managers-checkin': 'Check-in de Gestores',
  'clevel-checkin': 'Check-in C-Level',
  'team-okr-creation': 'Criação de OKRs',
  'team-kr-creation': 'Criação de KRs',
  'mbr': 'MBR',
};

export { WIZARD_TYPE_LABELS };

// ============================================================
// SESSION FIELDS
// ============================================================

const HISTORY_FIELDS = `
  id, bu_id, wizard_type, team_id, cycle_id, started_by, started_at,
  completed_at, decisions, reflection_data,
  teams!okr_wizard_sessions_team_id_fkey ( name ),
  cycles!okr_wizard_sessions_cycle_id_fkey ( name ),
  profiles!okr_wizard_sessions_started_by_fkey ( full_name )
`;

// ============================================================
// HOOKS
// ============================================================

export function useRitualHistory(filters: RitualHistoryFilters = {}) {
  const { currentBu } = useBu();
  const { profile, isAdmin } = useAuth();
  const buSupabase = useOptionalBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.okrs.ritualHistory(currentBu?.id ?? null, filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      if (!currentBu?.id || !profile?.id || !buSupabase) return [];

      let query = buSupabase
        .from('okr_wizard_sessions')
        .select(HISTORY_FIELDS)
        .eq('bu_id', currentBu.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(100);

      // Non-admins only see their own sessions
      if (!isAdmin) {
        query = query.eq('started_by', profile.id);
      }

      // Filters
      if (filters.wizardType && filters.wizardType !== 'all') {
        query = query.eq('wizard_type', filters.wizardType);
      }
      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.dateFrom) {
        query = query.gte('completed_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('completed_at', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any): RitualHistoryItem => ({
        id: row.id,
        wizardType: row.wizard_type as WizardPersona,
        teamId: row.team_id,
        teamName: row.teams?.name ?? null,
        cycleId: row.cycle_id,
        cycleName: row.cycles?.name ?? null,
        startedBy: row.started_by,
        startedByName: row.profiles?.full_name ?? null,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        decisions: extractDecisions(row),
        reflectionData: row.reflection_data as Record<string, unknown> | null,
      }));
    },
    enabled: !!currentBu?.id && !!profile?.id,
  });
}

export function useRitualDetail(sessionId: string | null) {
  const buSupabase = useOptionalBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.okrs.ritualDetail(sessionId),
    queryFn: async () => {
      if (!sessionId || !buSupabase) return null;

      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select(HISTORY_FIELDS)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const row = data as any;
      return {
        id: row.id,
        wizardType: row.wizard_type as WizardPersona,
        teamId: row.team_id,
        teamName: row.teams?.name ?? null,
        cycleId: row.cycle_id,
        cycleName: row.cycles?.name ?? null,
        startedBy: row.started_by,
        startedByName: row.profiles?.full_name ?? null,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        decisions: extractDecisions(row),
        reflectionData: row.reflection_data as Record<string, unknown> | null,
      } as RitualDetail;
    },
    enabled: !!sessionId,
  });
}

/**
 * Mutation to update a decision's follow-up status within a completed session.
 * Updates the `decisions` JSONB array in `okr_wizard_sessions`.
 */
export function useUpdateDecisionFollowUp() {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      decisionId,
      updates,
    }: {
      sessionId: string;
      decisionId: string;
      updates: Partial<TeamCheckinDecision> & { followUpStatus?: 'pending' | 'done' };
    }) => {
      if (!buSupabase) throw new Error('No supabase client');

      // Fetch current decisions
      const { data: session, error: fetchErr } = await buSupabase
        .from('okr_wizard_sessions')
        .select('decisions, reflection_data')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      // Update decision in the decisions array
      const currentDecisions = Array.isArray(session.decisions)
        ? (session.decisions as unknown as (TeamCheckinDecision & { followUpStatus?: string })[])
        : [];

      const updatedDecisions = currentDecisions.map(d =>
        d.id === decisionId ? { ...d, ...updates } : d
      );

      // Also update in reflection_data if decisions exist there
      let updatedReflectionData = session.reflection_data;
      if (updatedReflectionData && typeof updatedReflectionData === 'object') {
        const rd = updatedReflectionData as Record<string, unknown>;
        if (rd.data && typeof rd.data === 'object') {
          const data = rd.data as Record<string, unknown>;
          if (Array.isArray(data.decisions)) {
            data.decisions = (data.decisions as any[]).map((d: any) =>
              d.id === decisionId ? { ...d, ...updates } : d
            );
            updatedReflectionData = { ...rd, data: { ...data } } as any;
          }
        }
      }

      const { error } = await buSupabase
        .from('okr_wizard_sessions')
        .update({
          decisions: updatedDecisions as any,
          reflection_data: updatedReflectionData,
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.okrs.ritualHistoryListPrefix(currentBu?.id ?? null),
      });
    },
  });
}

// ============================================================
// HELPERS
// ============================================================

function extractDecisions(row: any): TeamCheckinDecision[] {
  // Decisions can be in the top-level `decisions` column OR in `reflection_data.data.decisions`
  if (Array.isArray(row.decisions) && row.decisions.length > 0) {
    return row.decisions as TeamCheckinDecision[];
  }

  // Fallback to reflection_data
  const rd = row.reflection_data;
  if (rd && typeof rd === 'object') {
    const data = (rd as any).data;
    if (data && Array.isArray(data.decisions)) {
      return data.decisions as TeamCheckinDecision[];
    }
  }

  return [];
}
