/**
 * Hook to fetch teams where the current user is a leader
 */
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import type { LeaderTeam } from "../types";

export function useLeaderTeams() {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  const { user } = useAuth();

  const { data: teams = [], isLoading, error } = useQuery({
    queryKey: queryKeys.home.leaderTeams(currentBuId ?? null, user?.id ?? null),
    queryFn: async () => {
      if (!supabase) {
        return [];
      }
      
      const { data, error } = await supabase.rpc("get_leader_teams");

      if (error) {
        console.error("Error fetching leader teams:", error);
        throw error;
      }

      return (data || []) as LeaderTeam[];
    },
    enabled: !!supabase && !!currentBuId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLeader = teams.length > 0;
  const hasMultipleTeams = teams.length > 1;

  return {
    teams,
    isLeader,
    hasMultipleTeams,
    isLoading,
    error,
  };
}
