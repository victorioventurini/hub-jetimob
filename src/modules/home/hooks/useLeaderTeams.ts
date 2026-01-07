/**
 * Hook to fetch teams where the current user is a leader
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import type { LeaderTeam } from "../types";

export function useLeaderTeams() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { user } = useAuth();

  const { data: teams = [], isLoading, error } = useQuery({
    queryKey: ["leader-teams", currentBuId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leader_teams");

      if (error) {
        console.error("Error fetching leader teams:", error);
        throw error;
      }

      return (data || []) as LeaderTeam[];
    },
    enabled: !!currentBuId && !!user?.id,
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
