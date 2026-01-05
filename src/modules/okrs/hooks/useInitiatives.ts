import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Initiative, CreateInitiativeInput, UpdateInitiativeInput, InitiativeStatus, InitiativePriority } from "../types/initiative";

// Fetch initiatives for a specific KR
export function useKrInitiatives(krId: string | undefined) {
  return useQuery({
    queryKey: ["initiatives", "kr", krId],
    queryFn: async () => {
      if (!krId) return [];
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .select("*")
        .eq("kr_id", krId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch owners separately - owner_user_id is profile.id
      const ownerIds = [...new Set((data || []).map(i => i.owner_user_id))];
      let ownerMap = new Map<string, { id: string; display_name: string | null; first_name: string | null; last_name: string | null; photo_url: string | null; }>();
      
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, display_name, first_name, last_name, photo_url")
          .in("id", ownerIds);
        
        ownerMap = new Map((owners || []).map(o => [o.id, { id: o.id, display_name: o.display_name, first_name: o.first_name, last_name: o.last_name, photo_url: o.photo_url }]));
      }
      
      return (data || []).map(initiative => ({
        ...initiative,
        owner: ownerMap.get(initiative.owner_user_id),
      })) as Initiative[];
    },
    enabled: !!krId,
  });
}

// Fetch all initiatives for a user (as owner) - expects profile.id
export function useUserInitiatives(profileId: string | undefined) {
  return useQuery({
    queryKey: ["initiatives", "user", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .select("*")
        .eq("owner_user_id", profileId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch owners separately - owner_user_id is profile.id
      const ownerIds = [...new Set((data || []).map(i => i.owner_user_id))];
      let ownerMap = new Map<string, { id: string; display_name: string | null; first_name: string | null; last_name: string | null; photo_url: string | null; }>();
      
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, display_name, first_name, last_name, photo_url")
          .in("id", ownerIds);
        
        ownerMap = new Map((owners || []).map(o => [o.id, { id: o.id, display_name: o.display_name, first_name: o.first_name, last_name: o.last_name, photo_url: o.photo_url }]));
      }
      
      return (data || []).map(initiative => ({
        ...initiative,
        owner: ownerMap.get(initiative.owner_user_id),
      })) as Initiative[];
    },
    enabled: !!profileId,
  });
}

// Fetch initiatives by status
export function useInitiativesByStatus(buId: string | undefined, status?: InitiativeStatus) {
  return useQuery({
    queryKey: ["initiatives", "status", buId, status],
    queryFn: async () => {
      let query = supabase
        .from("okr_initiatives")
        .select("*")
        .is("deleted_at", null);

      if (buId) {
        query = query.eq("bu_id", buId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch owners separately - owner_user_id is profile.id
      const ownerIds = [...new Set((data || []).map(i => i.owner_user_id))];
      let ownerMap = new Map<string, { id: string; display_name: string | null; first_name: string | null; last_name: string | null; photo_url: string | null; }>();
      
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, display_name, first_name, last_name, photo_url")
          .in("id", ownerIds);
        
        ownerMap = new Map((owners || []).map(o => [o.id, { id: o.id, display_name: o.display_name, first_name: o.first_name, last_name: o.last_name, photo_url: o.photo_url }]));
      }
      
      return (data || []).map(initiative => ({
        ...initiative,
        owner: ownerMap.get(initiative.owner_user_id),
      })) as Initiative[];
    },
    enabled: !!buId,
  });
}

// Create initiative
export function useCreateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInitiativeInput) => {
      const { data, error } = await supabase
        .from("okr_initiatives")
        .insert({
          name: input.name,
          description: input.description || null,
          kr_id: input.kr_id,
          bu_id: input.bu_id || null,
          owner_user_id: input.owner_user_id,
          status: (input.status || 'planned') as InitiativeStatus,
          priority: (input.priority || 'medium') as InitiativePriority,
          start_date: input.start_date || null,
          expected_end_date: input.expected_end_date || null,
          progress: input.progress ?? 0,
          contributors: input.contributors || [],
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", "kr", variables.kr_id] });
      queryClient.invalidateQueries({ queryKey: ["initiatives", "user"] });
      queryClient.invalidateQueries({ queryKey: ["initiatives", "status"] });
      toast.success("Iniciativa criada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar iniciativa");
    },
  });
}

// Update initiative
export function useUpdateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateInitiativeInput) => {
      const { id, ...updateData } = input;
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      toast.success("Iniciativa atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar iniciativa");
    },
  });
}

// Delete initiative (soft delete)
export function useDeleteInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initiativeId: string) => {
      const { error } = await supabase
        .from("okr_initiatives")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", initiativeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      toast.success("Iniciativa removida");
    },
    onError: () => {
      toast.error("Erro ao remover iniciativa");
    },
  });
}

// Update initiative status
export function useUpdateInitiativeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const { error } = await supabase
        .from("okr_initiatives")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}
