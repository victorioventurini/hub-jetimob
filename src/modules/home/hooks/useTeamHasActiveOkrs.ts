/**
 * Hook to check if a team has active OKRs in any active cycle
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useActiveCycles } from "@/modules/okrs/hooks/useCycleData";

export function useTeamHasActiveOkrs(teamId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { data: activeCycles, isLoading: isCyclesLoading } = useActiveCycles();
  
  // Get active cycle IDs (can be multiple: quarter, semester, year)
  const activeCycleIds = activeCycles?.map(c => c.id) ?? [];

  const { data: objectivesCount = 0, isLoading: isQueryLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamObjectives(currentBuId, teamId), 'has-active-okrs', activeCycleIds],
    queryFn: async () => {
      if (!teamId || activeCycleIds.length === 0) return 0;
      
      const { count, error } = await supabase
        .from('okr_team_objectives')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .in('cycle_id', activeCycleIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (error) {
        console.error('Error counting team objectives:', error);
        return 0;
      }
      
      return count ?? 0;
    },
    enabled: !!supabase && !!currentBuId && !!teamId && activeCycleIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    hasActiveOkrs: objectivesCount > 0,
    objectivesCount,
    isLoading: isCyclesLoading || isQueryLoading,
  };
}
