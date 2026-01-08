/**
 * Hook to manage leader scope (selected team) with localStorage persistence
 */
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useLeaderTeams } from "./useLeaderTeams";
import { queryKeys } from "@/lib/queryKeys";

const STORAGE_KEY_PREFIX = "hub.leader.selectedTeamId";

function getStorageKey(buId: string) {
  return `${STORAGE_KEY_PREFIX}.${buId}`;
}

export function useLeaderScope() {
  const { currentBuId } = useBu();
  const { teams, isLeader, hasMultipleTeams, isLoading: isTeamsLoading } = useLeaderTeams();
  const queryClient = useQueryClient();

  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage or first team
  useEffect(() => {
    if (isTeamsLoading || !currentBuId) return;

    const storageKey = getStorageKey(currentBuId);
    const storedId = localStorage.getItem(storageKey);

    // If stored ID exists and is valid, use it
    if (storedId && teams.some(t => t.team_id === storedId)) {
      setSelectedTeamIdState(storedId);
    } else if (teams.length > 0) {
      // Otherwise, select first team
      const firstTeamId = teams[0].team_id;
      setSelectedTeamIdState(firstTeamId);
      localStorage.setItem(storageKey, firstTeamId);
    }

    setIsInitialized(true);
  }, [teams, currentBuId, isTeamsLoading]);

  // Get current selected team object
  const selectedTeam = teams.find(t => t.team_id === selectedTeamId) || null;

  // Handler to change team
  const selectTeam = useCallback((teamId: string) => {
    if (!currentBuId) return;

    // Validate team exists
    if (!teams.some(t => t.team_id === teamId)) {
      console.warn("Attempted to select invalid team:", teamId);
      return;
    }

    // Update state
    setSelectedTeamIdState(teamId);

    // Persist to localStorage
    const storageKey = getStorageKey(currentBuId);
    localStorage.setItem(storageKey, teamId);

    // Invalidate dashboard queries to refetch with new team
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.home.leaderSummary(currentBuId ?? null, null) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.home.leaderFocus(currentBuId ?? null, null) 
    });
  }, [currentBuId, teams, queryClient]);

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
