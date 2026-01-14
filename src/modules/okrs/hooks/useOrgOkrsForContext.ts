/**
 * useOrgOkrsForContext - Hook para buscar OKRs organizacionais para contexto do wizard
 * 
 * Retorna dados dos OKRs organizacionais do ciclo atual para alinhamento
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface OrgKrForContext {
  id: string;
  title: string;
  progress: number;
  status: 'green' | 'yellow' | 'red' | 'not_started';
}

export interface OrgObjectiveForContext {
  id: string;
  title: string;
  description: string | null;
  status: string;
  keyResults: OrgKrForContext[];
  progress: number;
}

export interface OrgOkrsContext {
  objectives: OrgObjectiveForContext[];
  priorities: string[];
  year: number;
}

// ============================================================
// HOOK
// ============================================================

export function useOrgOkrsForContext(cycleId: string | null | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: [...queryKeys.okrs.orgObjectives(currentBuId), 'context', cycleId],
    queryFn: async (): Promise<OrgOkrsContext | null> => {
      if (!cycleId || !currentBuId || !supabase) return null;

      // Use current year - cycles don't have year column
      const year = new Date().getFullYear();

      // Fetch org objectives for the year
      const { data: objectives, error: objError } = await supabase
        .from('okr_org_objectives')
        .select('id, title, description, status, year')
        .eq('year', year)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (objError) throw objError;

      // Fetch org KRs
      const objectiveIds = (objectives || []).map(o => o.id);
      let krs: Array<{
        id: string;
        title: string;
        baseline: number;
        current_value: number;
        target: number;
        status: string;
        org_objective_id: string;
      }> = [];

      if (objectiveIds.length > 0) {
        const { data: krsData, error: krsError } = await supabase
          .from('okr_org_key_results')
          .select('id, title, baseline, current_value, target, status, org_objective_id')
          .in('org_objective_id', objectiveIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (krsError) throw krsError;
        krs = krsData || [];
      }

      // Build objectives with KRs
      const objectivesWithKrs: OrgObjectiveForContext[] = (objectives || []).map(obj => {
        const objKrs = krs.filter(kr => kr.org_objective_id === obj.id);
        
        const krsWithProgress: OrgKrForContext[] = objKrs.map(kr => {
          const range = kr.target - kr.baseline;
          const progress = range !== 0 
            ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / range) * 100))
            : 0;
          
          return {
            id: kr.id,
            title: kr.title,
            progress: Math.round(progress),
            status: kr.status as OrgKrForContext['status'],
          };
        });

        const avgProgress = krsWithProgress.length > 0
          ? Math.round(krsWithProgress.reduce((sum, kr) => sum + kr.progress, 0) / krsWithProgress.length)
          : 0;

        return {
          id: obj.id,
          title: obj.title,
          description: obj.description,
          status: obj.status,
          keyResults: krsWithProgress,
          progress: avgProgress,
        };
      });

      // Extract top 3 priorities (active objectives with most KRs)
      const priorities = objectivesWithKrs
        .filter(o => o.status === 'active')
        .sort((a, b) => b.keyResults.length - a.keyResults.length)
        .slice(0, 3)
        .map(o => o.title);

      return {
        objectives: objectivesWithKrs,
        priorities,
        year,
      };
    },
    enabled: !!cycleId && !!currentBuId && isReady && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
