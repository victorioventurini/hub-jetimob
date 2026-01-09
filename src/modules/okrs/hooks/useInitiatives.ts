import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import type { Initiative, CreateInitiativeInput, UpdateInitiativeInput, InitiativeStatus, InitiativePriority } from "../types/initiative";

// Fetch initiatives for a specific KR
export function useKrInitiatives(krId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ["initiatives", "kr", krId],
    queryFn: async () => {
      if (!krId || !supabase) return [];
      
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
    enabled: !!krId && isReady && !!supabase,
  });
}

// Fetch initiative count for a specific KR (lightweight query)
export function useKrInitiativesCount(krId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ["initiatives", "kr", krId, "count"],
    queryFn: async () => {
      if (!krId || !supabase) return 0;
      
      const { count, error } = await supabase
        .from("okr_initiatives")
        .select("id", { count: 'exact', head: true })
        .eq("kr_id", krId)
        .is("deleted_at", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!krId && isReady && !!supabase,
  });
}

// Fetch all initiatives for a user (as owner) - expects profile.id
export function useUserInitiatives(profileId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ["initiatives", "user", profileId],
    queryFn: async () => {
      if (!profileId || !supabase) return [];
      
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
    enabled: !!profileId && isReady && !!supabase,
  });
}

// Fetch initiatives by status
export function useInitiativesByStatus(buId: string | undefined, status?: InitiativeStatus) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ["initiatives", "status", buId, status],
    queryFn: async () => {
      if (!supabase) return [];
      
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
    enabled: !!buId && isReady && !!supabase,
  });
}

// Create initiative
export function useCreateInitiative() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: CreateInitiativeInput) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
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
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: UpdateInitiativeInput & { kr_id?: string }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { id, kr_id, ...updateData } = input;
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, kr_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the specific KR initiatives list
      if (data?.kr_id) {
        queryClient.invalidateQueries({ queryKey: ["initiatives", "kr", data.kr_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["initiatives", "user"] });
      queryClient.invalidateQueries({ queryKey: ["initiatives", "status"] });
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
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ initiativeId, krId }: { initiativeId: string; krId: string }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from("okr_initiatives")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", initiativeId);

      if (error) throw error;
      return { krId };
    },
    onSuccess: (data) => {
      // Invalidate the specific KR initiatives list
      queryClient.invalidateQueries({ queryKey: ["initiatives", "kr", data.krId] });
      queryClient.invalidateQueries({ queryKey: ["initiatives", "user"] });
      queryClient.invalidateQueries({ queryKey: ["initiatives", "status"] });
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
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
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
