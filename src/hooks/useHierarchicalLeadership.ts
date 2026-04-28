import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";

/**
 * Hierarchical leadership resolver — SSOT for "can this user manage X?".
 *
 * - `ledAreaIds`: areas where the current profile is leader OR co-leader.
 * - `manageableTeamIds`: teams where the user has direct OR inherited leadership
 *   (descendants via parent_team_id + teams of led areas), reusing
 *   `useTeamManagement` (which calls `get_manageable_teams`/OKR helpers).
 * - `canManageTeamHierarchical(teamId, areaId?)`: convenience predicate.
 * - `canManageAreaScope(areaId)`: convenience predicate for area-scoped entities.
 *
 * BU-isolated, impersonation-aware.
 */
export function useHierarchicalLeadership() {
  const profileId = useProfileId();
  const { isWildcard } = usePermissions();
  const { client, buId, isReady } = useOptionalBuClient();
  const {
    canManageTeam,
    manageableTeamIds,
    isLoading: teamLoading,
  } = useTeamManagement();

  const { data: ledAreaIds = [], isLoading: areasLoading } = useQuery({
    queryKey: ["hierarchical-leadership", "areas", buId, profileId],
    queryFn: async () => {
      if (!client || !profileId || !buId) return [];
      const { data, error } = await client
        .from("areas")
        .select("id")
        .eq("bu_id", buId)
        .or(`leader_user_id.eq.${profileId},co_leader_user_id.eq.${profileId}`)
        .is("deleted_at", null);

      if (error) {
        console.error("[useHierarchicalLeadership] areas error:", error);
        return [];
      }
      return data?.map((a) => a.id as string) ?? [];
    },
    enabled: isReady && !!profileId && !!buId && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = !isReady || teamLoading || areasLoading;

  const canManageAreaScope = useMemo(
    () => (areaId: string | null | undefined): boolean => {
      if (isWildcard) return true;
      if (!areaId) return false;
      return ledAreaIds.includes(areaId);
    },
    [isWildcard, ledAreaIds],
  );

  const canManageTeamHierarchical = useMemo(
    () => (teamId: string | null | undefined, teamAreaId?: string | null): boolean => {
      if (isWildcard) return true;
      if (!teamId) return false;
      if (canManageTeam(teamId)) return true; // direct + descendants (OKR helper)
      if (teamAreaId && ledAreaIds.includes(teamAreaId)) return true;
      return false;
    },
    [isWildcard, canManageTeam, ledAreaIds],
  );

  return {
    ledAreaIds,
    manageableTeamIds,
    canManageTeamHierarchical,
    canManageAreaScope,
    isLoading,
  };
}
