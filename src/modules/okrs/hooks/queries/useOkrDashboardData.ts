/**
 * OKR Dashboard Aggregated Data Hook
 * 
 * Uses rpc_okr_dashboard_data to fetch all dashboard data in a single call.
 * Replaces 8+ parallel queries with 1 RPC call.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { calculateProgressFromNullable } from '../../utils/progressCalculation';
import type { OkrOrgObjective, OkrOrgKeyResult, OkrTeamObjective, OkrTeamKeyResult } from '../../types';

export type OkrDashboardView = 'company' | 'team' | 'my';

export interface OkrDashboardParams {
  year?: number;
  view?: OkrDashboardView;
  teamId?: string;
}

export interface OkrTeam {
  id: string;
  name: string;
  description: string | null;
  parent_team_id: string | null;
  created_at: string;
}

export interface OrgObjectiveWithKrs extends OkrOrgObjective {
  key_results: OkrOrgKeyResult[];
}

export interface TeamObjectiveWithKrs extends OkrTeamObjective {
  key_results: OkrTeamKeyResult[];
  team: { id: string; name: string };
}

export interface SharedOkrInsights {
  shared_okrs_count: number;
  total_team_krs: number;
  overdue_shared_count: number;
}

export interface OkrDashboardData {
  teams: OkrTeam[];
  org_objectives: OrgObjectiveWithKrs[];
  team_objectives: TeamObjectiveWithKrs[];
  org_krs: Pick<OkrOrgKeyResult, 'id' | 'baseline' | 'current_value' | 'target' | 'direction' | 'status'>[];
  team_krs: (Pick<OkrTeamKeyResult, 'id' | 'baseline' | 'current_value' | 'target' | 'direction' | 'status'> & { linked_org_kr_id: string | null })[];
  latest_checkin_date: string | null;
  pending_checkins_count: number;
  shared_insights: SharedOkrInsights;
  meta: {
    bu_id: string;
    year: number;
    view: OkrDashboardView;
    team_id: string | null;
    fetched_at: string;
  };
}

/**
 * Fetch all OKR dashboard data in a single RPC call.
 * 
 * @param params - Optional parameters for filtering
 * @returns Query result with aggregated dashboard data
 */
export function useOkrDashboardData(params?: OkrDashboardParams) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  
  const currentYear = new Date().getFullYear();
  const year = params?.year ?? currentYear;
  const view = params?.view ?? 'company';
  const teamId = params?.teamId;

  return useQuery({
    queryKey: queryKeys.okrs.dashboardData(currentBu?.id ?? null, year, view, teamId),
    queryFn: async (): Promise<OkrDashboardData> => {
      if (!currentBu?.id) {
        throw new Error('BU não selecionada');
      }

      const { data, error } = await supabase.rpc('rpc_okr_dashboard_data', {
        p_bu_id: currentBu.id,
        p_year: year,
        p_view: view,
        p_team_id: teamId ?? null,
      });

      if (error) {
        console.error('[useOkrDashboardData] RPC error:', error);
        throw error;
      }

      return data as unknown as OkrDashboardData;
    },
    enabled: !!currentBu?.id,
    staleTime: 30_000, // 30s - dashboard data can be slightly stale
    gcTime: 5 * 60_000, // 5 minutes
  });
}

/**
 * Derive status distribution from KRs
 */
export function deriveStatusCounts(krs: { status: string }[]) {
  const counts = {
    on_track: 0,
    at_risk: 0,
    off_track: 0,
    achieved: 0,
    not_started: 0,
    total: krs.length,
  };

  for (const kr of krs) {
    const status = kr.status as keyof typeof counts;
    if (status in counts && status !== 'total') {
      counts[status]++;
    }
  }

  return counts;
}

/**
 * Calculate overall progress from KRs
 * Uses the centralized calculateProgress utility
 */
export function calculateOverallProgress(
  krs: { baseline?: number | string | null; current_value?: number | string | null; target?: number | string | null; direction?: string | null }[]
): number {
  if (!krs || krs.length === 0) return 0;

  const { calculateProgressFromNullable } = require('../../utils/progressCalculation');
  
  let totalProgress = 0;
  for (const kr of krs) {
    totalProgress += calculateProgressFromNullable(
      kr.baseline,
      kr.current_value,
      kr.target,
      kr.direction
    );
  }

  return totalProgress / krs.length;
}
