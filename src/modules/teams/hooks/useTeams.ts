import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamWithRelations, TeamFormData, TeamTreeNode } from "../types";
import { toast } from "sonner";

export function useTeams(includeInactive = false) {
  return useQuery({
    queryKey: ["teams", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("teams")
        .select(`
          *,
          leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url)
        `)
        .order("name");

      if (!includeInactive) {
        query = query.eq("status", "active");
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
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url, job_title)
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
      const { data: members } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, job_title, work_email")
        .eq("team_id", teamId)
        .is("deleted_at", null)
        .order("display_name");

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
  });
}

export function useTeamTree() {
  const { data: teams, ...rest } = useTeams(true);

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

    return rootTeams;
  };

  return {
    ...rest,
    data: teams,
    tree: teams ? buildTree(teams) : [],
  };
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TeamFormData) => {
      // Validate no circular reference
      if (data.parent_team_id) {
        const wouldCreateLoop = await checkCircularReference(
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
          status: data.status,
        })
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Time criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar time");
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.id] });
      toast.success("Time atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar time");
    },
  });
}

export function useDeactivateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("teams")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Time desativado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao desativar time");
    },
  });
}

async function checkCircularReference(
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
  return useQuery({
    queryKey: ["available-leaders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, job_title")
        .is("deleted_at", null)
        .eq("employment_status", "active")
        .order("display_name");

      if (error) throw error;
      return data;
    },
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
