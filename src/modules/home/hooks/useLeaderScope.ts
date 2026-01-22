/**
 * Hook to manage leader scope (selected team) with URL state persistence
 * 
 * @see DEVELOPMENT_STANDARDS.md E.1-E.3 - teamId deve ir para URL state
 */
import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useLeaderTeams } from "./useLeaderTeams";
import { queryKeys } from "@/lib/queryKeys";
import { useUrlState } from "@/shared/url";

export function useLeaderScope() {
  const { currentBuId } = useBu();
  const { teams, isLeader, hasMultipleTeams, isLoading: isTeamsLoading } = useLeaderTeams();
  const queryClient = useQueryClient();

  // URL state for team selection (per TCR E.1: teamId goes to URL)
  const { value: selectedTeamId, set: setSelectedTeamId } = useUrlState<string | null>({
    key: "teamId",
    defaultValue: null,
  });

  // Auto-select first team if none selected and teams are available
  useEffect(() => {
    if (isTeamsLoading || teams.length === 0) return;

    // If no team selected OR selected team is invalid, select first
    const isValidSelection = selectedTeamId && teams.some(t => t.team_id === selectedTeamId);
    
    if (!isValidSelection) {
      setSelectedTeamId(teams[0].team_id);
    }
  }, [teams, selectedTeamId, isTeamsLoading, setSelectedTeamId]);

  // Get current selected team object
  const selectedTeam = useMemo(() => {
    return teams.find(t => t.team_id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Handler to change team
  const selectTeam = useCallback((teamId: string) => {
    if (!currentBuId) return;

    // Validate team exists
    if (!teams.some(t => t.team_id === teamId)) {
      console.warn("Attempted to select invalid team:", teamId);
      return;
    }

    // Update URL state
    setSelectedTeamId(teamId);

    // Invalidate dashboard queries to refetch with new team
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.home.leaderSummary(currentBuId ?? null, null) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.home.leaderFocus(currentBuId ?? null, null) 
    });
  }, [currentBuId, teams, queryClient, setSelectedTeamId]);

  // Initialized when teams loaded and we have a valid selection (or no teams)
  const isInitialized = !isTeamsLoading && (teams.length === 0 || selectedTeam !== null);

  return {
    teams,
    selectedTeamId,
    selectedTeam,
    selectTeam,
    isLeader,
    hasMultipleTeams,
    isLoading: isTeamsLoading || !isInitialized,
  };
}
