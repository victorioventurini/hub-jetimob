/**
 * useCompanyOkrs - Hook para buscar OKRs de empresa para o C-Level Checkin Wizard
 * 
 * Busca os objetivos organizacionais do ano corrente e calcula métricas agregadas.
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { calculateProgress } from '../utils/progressCalculation';
import type { CompanyOkrSummary } from '@/modules/okrs/types/wizard';
import type { OkrDirection } from '../types';

interface CompanyOkr {
  id: string;
  title: string;
  progress: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================
// COMPANY OKRS HOOK
// ============================================================

export function useCompanyOkrs(year?: number) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['company-okrs', buId, currentYear],
    queryFn: async (): Promise<{
      okrs: CompanyOkr[];
      overallProgress: number;
      atRiskCount: number;
    }> => {
      if (!supabase || !buId) {
        return { okrs: [], overallProgress: 0, atRiskCount: 0 };
      }

      // Fetch org objectives for the year
      const { data: objectives, error: objError } = await supabase
        .from('okr_org_objectives')
        .select(`
          id,
          title,
          status
        `)
        .eq('bu_id', buId)
        .eq('year', currentYear)
        .eq('status', 'active')
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at');

      if (objError) throw objError;
      if (!objectives || objectives.length === 0) {
        return { okrs: [], overallProgress: 0, atRiskCount: 0 };
      }

      const objectiveIds = objectives.map(o => o.id);

      // Fetch org KRs for these objectives
      const { data: orgKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select(`
          id,
          org_objective_id,
          baseline,
          current_value,
          target,
          direction,
          status
        `)
        .in('org_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (krsError) throw krsError;

      // Calculate progress per objective
      const okrs: CompanyOkr[] = objectives.map(obj => {
        const objKrs = orgKrs?.filter(kr => kr.org_objective_id === obj.id) || [];
        
        let totalProgress = 0;
        let atRiskKrs = 0;
        let greenKrs = 0;

        for (const kr of objKrs) {
          const baseline = kr.baseline ?? 0;
          const current = kr.current_value ?? 0;
          const target = kr.target ?? 100;
          const direction = (kr.direction ?? 'up') as OkrDirection;

          const progress = calculateProgress(baseline, current, target, direction);
          totalProgress += progress;

          if (kr.status === 'yellow' || kr.status === 'red') {
            atRiskKrs++;
          }
          if (kr.status === 'green') {
            greenKrs++;
          }
        }

        const avgProgress = objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0;
        
        // Determine trend based on status distribution
        let trend: 'improving' | 'stable' | 'declining';
        if (objKrs.length === 0) {
          trend = 'stable';
        } else if (atRiskKrs > objKrs.length / 2) {
          trend = 'declining';
        } else if (greenKrs >= objKrs.length * 0.7) {
          trend = 'improving';
        } else {
          trend = 'stable';
        }

        return {
          id: obj.id,
          title: obj.title,
          progress: avgProgress,
          trend,
        };
      });

      // Calculate overall progress
      const totalProgress = okrs.reduce((sum, o) => sum + o.progress, 0);
      const overallProgress = okrs.length > 0 ? Math.round(totalProgress / okrs.length) : 0;

      // Count at-risk objectives
      const atRiskCount = okrs.filter(o => o.trend === 'declining' || o.progress < 50).length;

      return { okrs, overallProgress, atRiskCount };
    },
    enabled: isReady && !!buId,
    staleTime: 2 * 60 * 1000,
  });
}
