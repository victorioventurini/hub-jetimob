/**
 * useTeamOkrQuality - Hook para buscar métricas de qualidade das OKRs de um time
 * 
 * Combina dados de:
 * - useTeamOverviewMetrics (métricas de KRs e highlights)
 * - Objetivos do time com health scores
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useTeamOverviewMetrics } from "./useTeamOverviewMetrics";
import type { HealthStatus } from "../types/health";

// ============================================================
// TYPES
// ============================================================

export interface ObjectiveWithHealth {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  cycle_id: string;
  health_status: HealthStatus;
  health_score: number;
  kr_count: number;
  krs_updated: number;
  krs_at_risk: number;
}

export interface QualityOverview {
  totalObjectives: number;
  avgHealthScore: number;
  objectivesHealthy: number;
  objectivesAttention: number;
  objectivesRisk: number;
}

export interface TeamOkrQualityData {
  overview: QualityOverview;
  krMetrics: {
    totalKrs: number;
    krsUpdatedOnTime: number;
    krsUpdatedLate: number;
    krsNoUpdate: number;
    krsAtRisk: number;
    krsStagnant: number;
    initiativesCritical: number;
  };
  objectives: ObjectiveWithHealth[];
  isLoading: boolean;
  error: Error | null;
}

// ============================================================
// HOOK
// ============================================================

export function useTeamOkrQuality(
  teamId: string | null,
  cycleId: string | null
): TeamOkrQualityData {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // Fetch team overview metrics (reuse existing hook)
  const { 
    data: metricsData, 
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useTeamOverviewMetrics(cycleId, teamId || '');

  // Fetch objectives with health scores
  const {
    data: objectivesData,
    isLoading: isLoadingObjectives,
    error: objectivesError,
  } = useQuery({
    queryKey: queryKeys.okrs.teamQuality(currentBuId, teamId, cycleId),
    queryFn: async (): Promise<ObjectiveWithHealth[]> => {
      if (!teamId || !cycleId) return [];

      // Fetch team objectives with their KRs for this cycle
      const { data: objectives, error } = await supabase
        .from('okr_team_objectives')
        .select(`
          id,
          title,
          team_id,
          cycle_id,
          team:teams!inner (id, name),
          key_results:okr_team_key_results (
            id,
            status,
            last_checkin_at
          )
        `)
        .eq('team_id', teamId)
        .eq('cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null);

      if (error) throw error;

      // Calculate health for each objective
      return (objectives || []).map((obj) => {
        const krs = obj.key_results || [];
        const team = obj.team as unknown as { id: string; name: string };
        
        // Calculate health score based on KR status
        let healthScore = 100;
        let krsUpdated = 0;
        let krsAtRisk = 0;

        const now = new Date();
        const PENDING_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        for (const kr of krs) {
          const lastCheckin = kr.last_checkin_at ? new Date(kr.last_checkin_at) : null;
          const daysSinceCheckin = lastCheckin 
            ? Math.floor((now.getTime() - lastCheckin.getTime()) / (24 * 60 * 60 * 1000))
            : 999;

          if (daysSinceCheckin <= 7) {
            krsUpdated++;
          }

          if (kr.status === 'red' || kr.status === 'yellow') {
            krsAtRisk++;
          }

          // Deduct points based on status and update frequency
          if (kr.status === 'red') healthScore -= 20;
          else if (kr.status === 'yellow') healthScore -= 10;

          if (daysSinceCheckin > 14) healthScore -= 10;
          else if (daysSinceCheckin > 7) healthScore -= 5;
        }

        // Ensure score is within bounds
        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine health status
        let healthStatus: HealthStatus = 'healthy';
        if (healthScore < 50) healthStatus = 'risk';
        else if (healthScore < 75) healthStatus = 'attention';

        return {
          id: obj.id,
          title: obj.title,
          team_id: obj.team_id,
          team_name: team?.name || 'Time',
          cycle_id: obj.cycle_id,
          health_status: healthStatus,
          health_score: healthScore,
          kr_count: krs.length,
          krs_updated: krsUpdated,
          krs_at_risk: krsAtRisk,
        };
      });
    },
    enabled: !!supabase && !!currentBuId && !!teamId && !!cycleId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Calculate overview from objectives
  const overview: QualityOverview = {
    totalObjectives: objectivesData?.length || 0,
    avgHealthScore: objectivesData?.length
      ? Math.round(objectivesData.reduce((sum, obj) => sum + obj.health_score, 0) / objectivesData.length)
      : 0,
    objectivesHealthy: objectivesData?.filter(obj => obj.health_status === 'healthy').length || 0,
    objectivesAttention: objectivesData?.filter(obj => obj.health_status === 'attention').length || 0,
    objectivesRisk: objectivesData?.filter(obj => obj.health_status === 'risk').length || 0,
  };

  // Combine KR metrics
  const krMetrics = {
    totalKrs: metricsData?.metrics.totalKrs || 0,
    krsUpdatedOnTime: metricsData?.metrics.krsUpdatedOnTime || 0,
    krsUpdatedLate: metricsData?.metrics.krsUpdatedLate || 0,
    krsNoUpdate: metricsData?.metrics.krsNoUpdate || 0,
    krsAtRisk: metricsData?.metrics.krsAtRisk || 0,
    krsStagnant: metricsData?.metrics.krsStagnant || 0,
    initiativesCritical: metricsData?.metrics.initiativesCritical || 0,
  };

  return {
    overview,
    krMetrics,
    objectives: objectivesData || [],
    isLoading: isLoadingMetrics || isLoadingObjectives,
    error: (metricsError || objectivesError) as Error | null,
  };
}
