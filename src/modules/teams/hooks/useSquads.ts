import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  SquadWithRelations, 
  SquadFormData, 
  SquadMemberFormData,
  SquadProduct,
  SquadRole 
} from "../types/squad";
import { toast } from "sonner";
import { useBu } from "@/contexts/BuContext";

export function useSquads(teamId?: string) {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ["squads", { buId: currentBu?.id, teamId }],
    queryFn: async () => {
      let query = supabase
        .from("squads")
        .select(`
          *,
          squad_teams!inner(team_id)
        `)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If filtering by team, filter squads that include this team
      let squads = data || [];
      if (teamId) {
        squads = squads.filter((s: any) => 
          s.squad_teams?.some((st: any) => st.team_id === teamId)
        );
      }

      // Get member counts for each squad
      const squadIds = squads.map((s: any) => s.id);
      
      const { data: memberCounts } = await supabase
        .from("squad_memberships")
        .select("squad_id")
        .in("squad_id", squadIds);

      const countMap = new Map<string, number>();
      memberCounts?.forEach((m) => {
        countMap.set(m.squad_id, (countMap.get(m.squad_id) || 0) + 1);
      });

      // Get linked teams for each squad
      const { data: squadTeamsData } = await supabase
        .from("squad_teams")
        .select(`
          squad_id,
          team:teams(id, name)
        `)
        .in("squad_id", squadIds);

      const teamsMap = new Map<string, { id: string; name: string }[]>();
      squadTeamsData?.forEach((st: any) => {
        if (st.team) {
          const existing = teamsMap.get(st.squad_id) || [];
          existing.push(st.team);
          teamsMap.set(st.squad_id, existing);
        }
      });

      return squads.map((squad: any) => ({
        id: squad.id,
        name: squad.name,
        description: squad.description,
        bu_id: squad.bu_id,
        products: squad.products as SquadProduct[],
        status: squad.status,
        created_at: squad.created_at,
        updated_at: squad.updated_at,
        deleted_at: squad.deleted_at,
        member_count: countMap.get(squad.id) || 0,
        teams: teamsMap.get(squad.id) || [],
      })) as SquadWithRelations[];
    },
    enabled: !!currentBu?.id,
  });
}

export function useSquad(squadId: string | undefined) {
  return useQuery({
    queryKey: ["squad", squadId],
    queryFn: async () => {
      if (!squadId) return null;

      const { data, error } = await supabase
        .from("squads")
        .select("*")
        .eq("id", squadId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get linked teams
      const { data: squadTeams } = await supabase
        .from("squad_teams")
        .select(`
          team:teams(id, name)
        `)
        .eq("squad_id", squadId);

      // Get members with user info
      const { data: members } = await supabase
        .from("squad_memberships")
        .select(`
          id,
          user_id,
          role,
          user:profiles!squad_memberships_user_id_fkey(id, display_name, photo_url, job_title)
        `)
        .eq("squad_id", squadId);

      return {
        ...data,
        products: data.products as SquadProduct[],
        teams: squadTeams?.map((st: any) => st.team).filter(Boolean) || [],
        members: members?.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role as SquadRole,
          user: m.user,
        })) || [],
        member_count: members?.length || 0,
      } as SquadWithRelations;
    },
    enabled: !!squadId,
  });
}

export function useCreateSquad() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();

  return useMutation({
    mutationFn: async (data: SquadFormData) => {
      if (!currentBu?.id) {
        throw new Error("Nenhuma BU selecionada");
      }

      // Create squad
      const { data: squad, error } = await supabase
        .from("squads")
        .insert({
          name: data.name,
          description: data.description || null,
          products: data.products,
          status: data.status,
          bu_id: currentBu.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Link teams
      if (data.team_ids.length > 0) {
        const { error: teamError } = await supabase
          .from("squad_teams")
          .insert(
            data.team_ids.map((teamId) => ({
              squad_id: squad.id,
              team_id: teamId,
            }))
          );

        if (teamError) throw teamError;
      }

      return squad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      toast.success("Squad criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar squad");
    },
  });
}

export function useUpdateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SquadFormData>;
    }) => {
      // Update squad
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.products !== undefined) updateData.products = data.products;
      if (data.status !== undefined) updateData.status = data.status;

      const { data: squad, error } = await supabase
        .from("squads")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update team links if provided
      if (data.team_ids !== undefined) {
        // Remove existing links
        await supabase
          .from("squad_teams")
          .delete()
          .eq("squad_id", id);

        // Add new links
        if (data.team_ids.length > 0) {
          const { error: teamError } = await supabase
            .from("squad_teams")
            .insert(
              data.team_ids.map((teamId) => ({
                squad_id: id,
                team_id: teamId,
              }))
            );

          if (teamError) throw teamError;
        }
      }

      return squad;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      queryClient.invalidateQueries({ queryKey: ["squad", variables.id] });
      toast.success("Squad atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar squad");
    },
  });
}

export function useAddSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      data,
    }: {
      squadId: string;
      data: SquadMemberFormData;
    }) => {
      const { data: membership, error } = await supabase
        .from("squad_memberships")
        .insert({
          squad_id: squadId,
          user_id: data.user_id,
          role: data.role,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este usuário já é membro do squad");
        }
        throw error;
      }

      return membership;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      queryClient.invalidateQueries({ queryKey: ["squad", variables.squadId] });
      toast.success("Membro adicionado ao squad");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });
}

export function useUpdateSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      squadId,
      role,
    }: {
      membershipId: string;
      squadId: string;
      role: SquadRole;
    }) => {
      const { error } = await supabase
        .from("squad_memberships")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      queryClient.invalidateQueries({ queryKey: ["squad", variables.squadId] });
      toast.success("Papel atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar papel");
    },
  });
}

export function useRemoveSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      squadId,
    }: {
      membershipId: string;
      squadId: string;
    }) => {
      const { error } = await supabase
        .from("squad_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      queryClient.invalidateQueries({ queryKey: ["squad", variables.squadId] });
      toast.success("Membro removido do squad");
    },
    onError: () => {
      toast.error("Erro ao remover membro");
    },
  });
}

export function useDeactivateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (squadId: string) => {
      const { error } = await supabase
        .from("squads")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", squadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      toast.success("Squad desativado");
    },
    onError: () => {
      toast.error("Erro ao desativar squad");
    },
  });
}
