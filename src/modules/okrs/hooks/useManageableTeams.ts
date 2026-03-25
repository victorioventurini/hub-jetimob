import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import type { FlatTeamItem } from "@/modules/teams/hooks";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

interface ManageableTeam {
  id: string;
  name: string;
  parent_team_id: string | null;
}

/**
 * Hook que retorna apenas os times que o usuário pode gerenciar para OKRs.
 * 
 * Regras:
 * - Admin: todos os times da BU
 * - Líder: time próprio + todos os descendentes (sub-times, squads)
 * - Colaborador comum: nenhum time (array vazio)
 * 
 * IMPORTANTE: Durante impersonação, usa RPC especial para buscar times do usuário impersonado.
 * 
 * SAFE for pre-BU: Uses useOptionalBuClient() and only queries when BU is selected.
 */
export function useManageableTeams() {
  const { user } = useAuth();
  const { client, isReady, buId } = useOptionalBuClient();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  // Determine effective user for query key
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : user?.id;

  // Build query key with explicit impersonation flag for proper cache separation
  const queryKey = isImpersonating && impersonatedUserId
    ? ['okr-manageable-teams', 'impersonated', buId, impersonatedUserId] as const
    : ['okr-manageable-teams', 'real', buId, user?.id] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ManageableTeam[]> => {

      if (!client || !buId) {
        return [];
      }

      // Use impersonation RPC when impersonating
      if (isImpersonating && impersonatedUserId) {
        
        
        const { data: teamIdsResult, error: rpcError } = await client.rpc(
          "get_okr_manageable_team_ids_for_impersonation" as any,
          { 
            p_target_profile_id: impersonatedUserId,
            p_bu_id: buId 
          }
        );

        

        if (rpcError) {
          console.error("Error fetching impersonated manageable team IDs:", rpcError);
          return [];
        }

        const teamIds = (teamIdsResult as unknown as string[]) || [];
        
        if (teamIds.length === 0) {
          console.log("[useManageableTeams] No manageable teams for impersonated user");
          return [];
        }

        // Fetch team details for those IDs
        const { data: teams, error: teamsError } = await client
          .from("teams")
          .select("id, name, parent_team_id")
          .in("id", teamIds)
          .is("deleted_at", null)
          .eq("status", "active")
          .order("name");

        if (teamsError) {
          console.error("Error fetching team details:", teamsError);
          return [];
        }

        console.log("[useManageableTeams] Impersonated user can manage teams:", teams?.map(t => t.name));
        return teams || [];
      }

      // Normal flow
      console.log("[useManageableTeams] Using NORMAL RPC for real user");
      
      const { data: teamIdsResult, error: rpcError } = await client.rpc(
        "get_okr_manageable_team_ids",
        { p_bu_id: buId }
      );

      console.log("[useManageableTeams] NORMAL RPC result:", { teamIdsResult, rpcError });

      if (rpcError) {
        console.error("Error fetching manageable team IDs:", rpcError);
        return [];
      }

      const teamIds = teamIdsResult as string[] | null;
      if (!teamIds || teamIds.length === 0) {
        console.log("[useManageableTeams] No manageable teams for real user");
        return [];
      }

      // Fetch team details for those IDs
      const { data: teams, error: teamsError } = await client
        .from("teams")
        .select("id, name, parent_team_id")
        .in("id", teamIds)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (teamsError) {
        console.error("Error fetching team details:", teamsError);
        return [];
      }

      console.log("[useManageableTeams] Real user can manage teams:", teams?.map(t => t.name));
      return teams || [];
    },
    enabled: isReady && !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return {
    teams: query.data || [],
    isLoading: !isReady || query.isLoading,
    error: query.error,
    hasManageableTeams: (query.data?.length || 0) > 0,
  };
}

/**
 * Returns a flat hierarchical list of manageable teams for use in selects.
 * Parents are listed first, children indented below.
 */
export function useManageableTeamsFlat(): {
  teams: FlatTeamItem[];
  isLoading: boolean;
  hasManageableTeams: boolean;
  userTeamId: string | null;
} {
  const { teams, isLoading, hasManageableTeams } = useManageableTeams();
  const { user } = useAuth();
  const { client, isReady, buId } = useOptionalBuClient();

  // Get user's own team (for pre-selection)
  const userTeamQuery = useQuery({
    queryKey: queryKeys.okrs.myTeamId(buId ?? null, user?.id ?? null),
    queryFn: async (): Promise<string | null> => {
      if (!client || !buId || !user?.id) return null;

      const { data, error } = await client
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return null;
      return data.team_id;
    },
    enabled: isReady && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  // Build hierarchical flat list
  const flattenTeams = (teamList: typeof teams): FlatTeamItem[] => {
    if (!teamList.length) return [];

    // Separate root teams and children
    const teamMap = new Map(teamList.map((t) => [t.id, t]));
    const childrenMap = new Map<string | null, typeof teams>();

    teamList.forEach((team) => {
      const parentId = team.parent_team_id;
      // Only group under parent if parent is also in manageable list
      const effectiveParent = parentId && teamMap.has(parentId) ? parentId : null;
      const existing = childrenMap.get(effectiveParent) || [];
      existing.push(team);
      childrenMap.set(effectiveParent, existing);
    });

    const result: FlatTeamItem[] = [];

    // Recursive flatten
    const addTeamAndChildren = (
      team: (typeof teams)[0],
      level: number,
      parentId: string | null
    ) => {
      result.push({
        id: team.id,
        name: team.name,
        level,
        parentId,
      });

      const children = childrenMap.get(team.id) || [];
      children
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((child) => addTeamAndChildren(child, level + 1, team.id));
    };

    // Start with root teams (no parent in the manageable list)
    const rootTeams = childrenMap.get(null) || [];
    rootTeams
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((team) => addTeamAndChildren(team, 0, null));

    return result;
  };

  return {
    teams: flattenTeams(teams),
    isLoading: isLoading || userTeamQuery.isLoading,
    hasManageableTeams,
    userTeamId: userTeamQuery.data || null,
  };
}
