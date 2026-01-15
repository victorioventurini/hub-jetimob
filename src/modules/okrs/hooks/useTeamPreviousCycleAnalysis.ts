/**
 * useTeamPreviousCycleAnalysis - Hook para análise do ciclo anterior do time
 * 
 * Retorna dados para o step de retrospectiva do wizard de criação de OKRs
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { differenceInDays, parseISO } from 'date-fns';

// ============================================================
// TYPES
// ============================================================

export interface PreviousCycleObjective {
  id: string;
  title: string;
  status: string;
  progress: number;
  krsCount: number;
  krsCompleted: number;
}

export interface AbandonedKr {
  id: string;
  title: string;
  objectiveTitle: string;
  lastCheckinAt: string | null;
  weeksWithoutUpdate: number;
}

export interface KpiTrend {
  id: string;
  name: string;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
}

export interface PreviousCycleAnalysis {
  objectives: PreviousCycleObjective[];
  avgCompletion: number;
  abandonedKrs: AbandonedKr[];
  kpiTrends: KpiTrend[];
  totalKrsCreated: number;
  totalKrsWithRegularCheckins: number;
}

// ============================================================
// HOOK
// ============================================================

export function useTeamPreviousCycleAnalysis(
  teamId: string | null | undefined,
  currentCycleId: string | null | undefined
) {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: [...queryKeys.okrs.teamObjectives(currentBuId), 'previous-cycle', teamId, currentCycleId],
    queryFn: async (): Promise<PreviousCycleAnalysis | null> => {
      if (!teamId || !currentCycleId || !currentBuId || !supabase) return null;

      // Get current cycle to find previous one
      const { data: currentCycle, error: cycleError } = await supabase
        .from('cycles')
        .select('id, start_date, type')
        .eq('id', currentCycleId)
        .single();

      if (cycleError || !currentCycle) return null;

      // Find previous cycle of the same type
      const { data: previousCycle, error: prevError } = await supabase
        .from('cycles')
        .select('id, name, start_date, end_date')
        .eq('type', currentCycle.type)
        .lt('start_date', currentCycle.start_date)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevError || !previousCycle) {
        return {
          objectives: [],
          avgCompletion: 0,
          abandonedKrs: [],
          kpiTrends: [],
          totalKrsCreated: 0,
          totalKrsWithRegularCheckins: 0,
        };
      }

      // Fetch team objectives from previous cycle (exclude cancelled)
      const { data: objectives, error: objError } = await supabase
        .from('okr_team_objectives')
        .select('id, title, status, team_id')
        .eq('team_id', teamId)
        .eq('cycle_id', previousCycle.id)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled');

      if (objError) throw objError;

      // Fetch KRs for those objectives
      const objectiveIds = (objectives || []).map(o => o.id);
      let krs: Array<{
        id: string;
        title: string;
        baseline: number;
        current_value: number;
        target: number;
        status: string;
        last_checkin_at: string | null;
        team_objective_id: string;
      }> = [];
      
      if (objectiveIds.length > 0) {
        const { data: krsData, error: krsError } = await supabase
          .from('okr_team_key_results')
          .select('id, title, baseline, current_value, target, status, last_checkin_at, team_objective_id')
          .in('team_objective_id', objectiveIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (krsError) throw krsError;
        krs = krsData || [];
      }

      // Calculate objectives with progress
      const objectivesWithProgress: PreviousCycleObjective[] = (objectives || []).map(obj => {
        const objKrs = krs.filter(kr => kr.team_objective_id === obj.id);
        const completedKrs = objKrs.filter(kr => {
          const range = kr.target - kr.baseline;
          const progress = range !== 0 ? ((kr.current_value - kr.baseline) / range) * 100 : 0;
          return progress >= 100;
        });
        
        const avgProgress = objKrs.length > 0
          ? objKrs.reduce((sum, kr) => {
              const range = kr.target - kr.baseline;
              const progress = range !== 0 ? ((kr.current_value - kr.baseline) / range) * 100 : 0;
              return sum + Math.min(100, Math.max(0, progress));
            }, 0) / objKrs.length
          : 0;

        return {
          id: obj.id,
          title: obj.title,
          status: obj.status,
          progress: Math.round(avgProgress),
          krsCount: objKrs.length,
          krsCompleted: completedKrs.length,
        };
      });

      // Calculate average completion
      const avgCompletion = objectivesWithProgress.length > 0
        ? Math.round(objectivesWithProgress.reduce((sum, o) => sum + o.progress, 0) / objectivesWithProgress.length)
        : 0;

      // Find abandoned KRs (no checkin for 2+ weeks during cycle)
      const ABANDONED_THRESHOLD_DAYS = 14;
      const now = new Date();
      
      const abandonedKrs: AbandonedKr[] = krs
        .filter(kr => {
          if (!kr.last_checkin_at) return true;
          const daysSinceCheckin = differenceInDays(now, parseISO(kr.last_checkin_at));
          return daysSinceCheckin > ABANDONED_THRESHOLD_DAYS;
        })
        .map(kr => {
          const objective = objectives?.find(o => o.id === kr.team_objective_id);
          const weeksWithoutUpdate = kr.last_checkin_at
            ? Math.floor(differenceInDays(now, parseISO(kr.last_checkin_at)) / 7)
            : 99;
          
          return {
            id: kr.id,
            title: kr.title,
            objectiveTitle: objective?.title || '',
            lastCheckinAt: kr.last_checkin_at,
            weeksWithoutUpdate,
          };
        })
        .slice(0, 5); // Limit to top 5

      // Count KRs with regular checkins
      const krsWithRegularCheckins = krs.filter(kr => {
        if (!kr.last_checkin_at) return false;
        const daysSinceCheckin = differenceInDays(now, parseISO(kr.last_checkin_at));
        return daysSinceCheckin <= 7;
      }).length;

      return {
        objectives: objectivesWithProgress,
        avgCompletion,
        abandonedKrs,
        kpiTrends: [], // TODO: Implement KPI trends if needed
        totalKrsCreated: krs.length,
        totalKrsWithRegularCheckins: krsWithRegularCheckins,
      };
    },
    enabled: !!teamId && !!currentCycleId && !!currentBuId && isReady && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
