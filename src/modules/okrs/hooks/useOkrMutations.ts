import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ========================
// ORG OBJECTIVES MUTATIONS
// ========================
export function useDeleteOrgObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      // Soft delete - set deleted_at
      const { error } = await supabase
        .from("okr_org_objectives")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-org-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-org-objectives-with-krs"] });
      toast.success("Objetivo organizacional excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir objetivo");
    },
  });
}

export function useDeleteOrgKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (krId: string) => {
      // Soft delete
      const { error } = await supabase
        .from("okr_org_key_results")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-org-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-org-objectives-with-krs"] });
      toast.success("Key Result excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir KR");
    },
  });
}

// ========================
// TEAM OBJECTIVES MUTATIONS
// ========================
export function useDeleteTeamObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      // Soft delete
      const { error } = await supabase
        .from("okr_team_objectives")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-team-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-team-objectives-with-krs"] });
      toast.success("Objetivo de time excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir objetivo");
    },
  });
}

export function useDeleteTeamKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (krId: string) => {
      // Soft delete
      const { error } = await supabase
        .from("okr_team_key_results")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", krId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-team-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-team-objectives-with-krs"] });
      toast.success("Key Result excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir KR");
    },
  });
}
