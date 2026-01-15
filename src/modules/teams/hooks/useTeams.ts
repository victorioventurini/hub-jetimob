import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { TeamWithRelations, TeamFormData, TeamTreeNode } from "../types";
import { toast } from "sonner";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface UseTeamsOptions {
  includeInactive?: boolean;
  search?: string;
  parentTeamId?: string | null;
  leaderId?: string | null;
}

export function useTeams(optionsOrIncludeInactive: UseTeamsOptions | boolean = false) {
  // Support legacy boolean API and new options object API
  const options: UseTeamsOptions = typeof optionsOrIncludeInactive === 'boolean' 
    ? { includeInactive: optionsOrIncludeInactive }
    : optionsOrIncludeInactive;
  
  const { includeInactive = false, search, parentTeamId, leaderId } = options;
  const { currentBu } = useBu();
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.teams.list(buId ?? null, includeInactive),
    queryFn: async () => {
      if (!supabase || !buId) return [];
      
      let query = supabase
        .from("teams")
        .select(`
          id, name, description, status, parent_team_id, bu_id, created_at, updated_at, deleted_at, leader_user_id, area_id,
          leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url),
          area:areas!teams_area_id_fkey(id, name, color)
        `)
        .order("name");

      // Filter by BU
      query = query.eq("bu_id", buId);

      // Always exclude soft-deleted teams
      query = query.is("deleted_at", null);

      if (!includeInactive) {
        query = query.eq("status", "active");
      }

      // Server-side text search
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.ilike("name", term);
      }

      // Server-side parent team filter
      if (parentTeamId) {
        query = query.eq("parent_team_id", parentTeamId);
      }

      // Server-side leader filter
      if (leaderId) {
        query = query.eq("leader_user_id", leaderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get member counts
      const { data: memberCounts } = await supabase
        .from("profiles")
        .select("team_id")
        .not("team_id", "is", null)
        .is("deleted_at", null);

      const countMap = new Map<string, number>();
      memberCounts?.forEach((m) => {
        if (m.team_id) {
          countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
        }
      });

      // Get child teams and parent team lookups
      const childTeamsMap = new Map<string, { id: string; name: string; status: string }[]>();
      const parentTeamMap = new Map<string, { id: string; name: string }>();
      data?.forEach((team) => {
        parentTeamMap.set(team.id, { id: team.id, name: team.name });
        if (team.parent_team_id) {
          const existing = childTeamsMap.get(team.parent_team_id) || [];
          existing.push({ id: team.id, name: team.name, status: team.status });
          childTeamsMap.set(team.parent_team_id, existing);
        }
      });

      return (data || []).map((team) => ({
        ...team,
        member_count: countMap.get(team.id) || 0,
        child_teams: childTeamsMap.get(team.id) || [],
        parent_team: team.parent_team_id ? parentTeamMap.get(team.parent_team_id) : null,
      })) as TeamWithRelations[];
    },
    enabled: isReady && !!buId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTeam(teamId: string | undefined) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("teams")
        .select(`
          id, name, description, status, parent_team_id, bu_id, created_at, updated_at, deleted_at, leader_user_id, area_id,
          leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url)
        `)
        .eq("id", teamId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get child teams
      const { data: childTeams } = await supabase
        .from("teams")
        .select("id, name, status")
        .eq("parent_team_id", teamId)
        .is("deleted_at", null);

      // Get member count
      const { count: memberCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .is("deleted_at", null);

      // Get team members
      const { data: membersRaw } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, job_title_rel:job_titles!job_title_id(name), work_email")
        .eq("team_id", teamId)
        .is("deleted_at", null)
        .order("display_name");
      
      const members = (membersRaw || []).map(m => ({
        id: m.id,
        display_name: m.display_name,
        photo_url: m.photo_url,
        job_title: (m.job_title_rel as { name: string } | null)?.name || null,
        work_email: m.work_email,
      }));

      // Get parent team info
      let parentTeam = null;
      if (data.parent_team_id) {
        const { data: pt } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", data.parent_team_id)
          .maybeSingle();
        parentTeam = pt;
      }

      return {
        ...data,
        child_teams: childTeams || [],
        member_count: memberCount || 0,
        members: members || [],
        parent_team: parentTeam,
      } as TeamWithRelations & { members: any[] };
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export interface FlatTeamItem {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}

export function useTeamTree(includeInactive = false) {
  const { data: teams, ...rest } = useTeams(includeInactive);

  const buildTree = (teams: TeamWithRelations[]): TeamTreeNode[] => {
    const teamMap = new Map<string, TeamTreeNode>();
    const rootTeams: TeamTreeNode[] = [];

    // Create nodes
    teams.forEach((team) => {
      teamMap.set(team.id, {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status,
        leader: team.leader,
        member_count: team.member_count || 0,
        children: [],
      });
    });

    // Build tree
    teams.forEach((team) => {
      const node = teamMap.get(team.id)!;
      if (team.parent_team_id && teamMap.has(team.parent_team_id)) {
        teamMap.get(team.parent_team_id)!.children.push(node);
      } else {
        rootTeams.push(node);
      }
    });

    // Sort children alphabetically
    const sortChildren = (nodes: TeamTreeNode[]): TeamTreeNode[] => {
      return nodes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((node) => ({
          ...node,
          children: sortChildren(node.children),
        }));
    };

    return sortChildren(rootTeams);
  };

  return {
    ...rest,
    data: teams,
    tree: teams ? buildTree(teams) : [],
  };
}

/**
 * Returns a flat list of teams with hierarchy level for use in dropdowns.
 * Parent teams come first, followed by their children with indentation level.
 */
export function useHierarchicalTeamList() {
  const { tree, isLoading, error } = useTeamTree();

  const flattenTree = (nodes: TeamTreeNode[], level = 0): FlatTeamItem[] => {
    const result: FlatTeamItem[] = [];
    
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name,
        level,
        parentId: null, // Not needed for display
      });
      
      if (node.children.length > 0) {
        result.push(...flattenTree(node.children, level + 1));
      }
    }
    
    return result;
  };

  return {
    teams: flattenTree(tree),
    isLoading,
    error,
  };
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: TeamFormData) => {
      if (!currentBu?.id) {
        throw new Error("Nenhuma BU selecionada");
      }

      // Validate no circular reference
      if (data.parent_team_id) {
        const wouldCreateLoop = await checkCircularReference(
          supabase,
          null,
          data.parent_team_id
        );
        if (wouldCreateLoop) {
          throw new Error("Referência circular detectada na hierarquia de times");
        }
      }

      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description || null,
          leader_user_id: data.leader_user_id || null,
          parent_team_id: data.parent_team_id || null,
          area_id: data.area_id || null,
          status: data.status,
          bu_id: currentBu.id,
        })
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(currentBu?.id ?? null, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(currentBu?.id ?? null, true) });
      toast.success("Time criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar time");
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TeamFormData>;
    }) => {
      // Validate no circular reference
      if (data.parent_team_id !== undefined) {
        const wouldCreateLoop = await checkCircularReference(
          supabase,
          id,
          data.parent_team_id
        );
        if (wouldCreateLoop) {
          throw new Error("Referência circular detectada na hierarquia de times");
        }
      }

      const { data: team, error } = await supabase
        .from("teams")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(null, false), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(null, true), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(variables.id) });
      toast.success("Time atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar time");
    },
  });
}

export function useDeactivateTeam() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("teams")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", teamId);

      if (error) throw error;
      return teamId;
    },
    // Optimistic update: remove from active list immediately
    onMutate: async (teamId) => {
      const activeQueryKey = queryKeys.teams.list(buId, false);
      await queryClient.cancelQueries({ queryKey: activeQueryKey });
      
      const previousData = queryClient.getQueryData<TeamWithRelations[]>(activeQueryKey);
      
      if (previousData) {
        queryClient.setQueryData(
          activeQueryKey,
          previousData.filter((team) => team.id !== teamId)
        );
      }
      
      return { previousData, queryKey: activeQueryKey };
    },
    onError: (_error, _teamId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error("Erro ao desativar time");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(buId, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(buId, true) });
      toast.success("Time desativado com sucesso");
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async (teamId: string) => {
      // Soft delete - set deleted_at
      const { error } = await supabase
        .from("teams")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", teamId);

      if (error) throw error;
      return teamId;
    },
    // Optimistic update: remove from list immediately
    onMutate: async (teamId) => {
      // Cancel both active and inactive queries
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.list(buId, false) });
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.list(buId, true) });
      
      const activeKey = queryKeys.teams.list(buId, false);
      const inactiveKey = queryKeys.teams.list(buId, true);
      
      const previousActive = queryClient.getQueryData<TeamWithRelations[]>(activeKey);
      const previousInactive = queryClient.getQueryData<TeamWithRelations[]>(inactiveKey);
      
      if (previousActive) {
        queryClient.setQueryData(activeKey, previousActive.filter((t) => t.id !== teamId));
      }
      if (previousInactive) {
        queryClient.setQueryData(inactiveKey, previousInactive.filter((t) => t.id !== teamId));
      }
      
      return { previousActive, previousInactive, activeKey, inactiveKey };
    },
    onError: (_error, _teamId, context) => {
      if (context?.previousActive) {
        queryClient.setQueryData(context.activeKey, context.previousActive);
      }
      if (context?.previousInactive) {
        queryClient.setQueryData(context.inactiveKey, context.previousInactive);
      }
      toast.error("Erro ao excluir time");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(buId, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(buId, true) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(undefined) });
      toast.success("Time excluído com sucesso");
    },
  });
}

async function checkCircularReference(
  supabase: ReturnType<typeof useBuScopedSupabase>,
  teamId: string | null,
  parentTeamId: string | null
): Promise<boolean> {
  if (!parentTeamId) return false;
  if (teamId === parentTeamId) return true;

  // Check if parentTeamId would create a loop
  const visited = new Set<string>();
  let currentId: string | null = parentTeamId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    if (teamId && currentId === teamId) return true;
    visited.add(currentId);

    const { data } = await supabase
      .from("teams")
      .select("parent_team_id")
      .eq("id", currentId)
      .maybeSingle();

    currentId = data?.parent_team_id || null;
  }

  return false;
}

export function useAvailableLeaders() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.teams.availableLeaders(currentBu?.id ?? null),
    queryFn: async () => {
      // Use canonical view - shows ALL registered users
      let query = supabase
        .from("v_bu_active_profiles")
        .select("id, display_name, photo_url, onboarding_completed")
        .order("display_name");

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!currentBu?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - leader list changes rarely
  });
}

export function useTeamStats() {
  const { data: teams } = useTeams(true);

  if (!teams) {
    return {
      totalActive: 0,
      totalInactive: 0,
      totalMembers: 0,
      parentTeams: 0,
      averageMembers: 0,
    };
  }

  const activeTeams = teams.filter((t) => t.status === "active");
  const inactiveTeams = teams.filter((t) => t.status === "inactive");
  const totalMembers = teams.reduce((acc, t) => acc + (t.member_count || 0), 0);
  const parentTeams = teams.filter(
    (t) => !t.parent_team_id && t.child_teams && t.child_teams.length > 0
  );

  return {
    totalActive: activeTeams.length,
    totalInactive: inactiveTeams.length,
    totalMembers,
    parentTeams: parentTeams.length,
    averageMembers: activeTeams.length
      ? Math.round(totalMembers / activeTeams.length)
      : 0,
  };
}
