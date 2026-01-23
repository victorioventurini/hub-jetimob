/**
 * Hook to fetch teams where the current user (or impersonated user) is a leader
 */
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import type { LeaderTeam } from "../types";

export function useLeaderTeams() {
  const { currentBuId } = useBu();
  const { user } = useAuth();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  // Use optional client with strict gating
  const { client: supabase, isReady: buIsReady } = useOptionalBuClient();

  // Determine effective user ID for data fetching
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : user?.id;

  const { data: teams = [], isLoading, error } = useQuery({
    queryKey: isImpersonating && impersonatedUserId
      ? [...queryKeys.home.leaderTeams(currentBuId ?? null, impersonatedUserId), 'impersonated']
      : queryKeys.home.leaderTeams(currentBuId ?? null, user?.id ?? null),
    queryFn: async () => {
      if (!supabase || !currentBuId) {
        return [];
      }
      
      // Use impersonation RPC when impersonating
      if (isImpersonating && impersonatedUserId) {
        const { data, error } = await supabase.rpc("get_leader_teams_for_impersonation", {
          p_target_profile_id: impersonatedUserId,
          p_bu_id: currentBuId,
        });

        if (error) {
          console.error("Error fetching impersonated leader teams:", error);
          throw error;
        }

        return ((data || []) as { team_id: string; team_name: string; member_count: number }[]).map(t => ({
          team_id: t.team_id,
          team_name: t.team_name,
          member_count: t.member_count,
        })) as LeaderTeam[];
      }
      
      // Normal flow
      const { data, error } = await supabase.rpc("get_leader_teams");

      if (error) {
        console.error("Error fetching leader teams:", error);
        throw error;
      }

      return (data || []) as LeaderTeam[];
    },
    // Gate query with buIsReady to prevent premature calls
    enabled: buIsReady && !!supabase && !!currentBuId && !!effectiveUserId,
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
