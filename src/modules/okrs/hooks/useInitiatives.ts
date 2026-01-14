import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { Initiative, CreateInitiativeInput, UpdateInitiativeInput, InitiativeStatus, InitiativePriority } from "../types/initiative";

// Fields for initiative queries (explicit, no select('*'))
const INITIATIVE_FIELDS = `
  id, bu_id, kr_id, name, description, status, priority, progress,
  owner_user_id, contributors, start_date, expected_end_date,
  notes, created_at, updated_at, deleted_at
` as const;

// Fetch initiatives for a specific KR
export function useKrInitiatives(krId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.initiatives(krId || ''),
    queryFn: async () => {
      if (!krId || !supabase) return [];
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .select(INITIATIVE_FIELDS)
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
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch initiative count for a specific KR (lightweight query)
export function useKrInitiativesCount(krId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.initiativesCount(krId || ''),
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
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch all initiatives for a user (as owner) - expects profile.id
export function useUserInitiatives(profileId: string | undefined) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.initiativesByUser(profileId ?? null),
    queryFn: async () => {
      if (!profileId || !supabase) return [];
      
      const { data, error } = await supabase
        .from("okr_initiatives")
        .select(INITIATIVE_FIELDS)
        .eq("owner_user_id", profileId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(100);

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
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch initiatives by status
export function useInitiativesByStatus(buId: string | undefined, status?: InitiativeStatus) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.initiativesByStatus(buId ?? null, status),
    queryFn: async () => {
      if (!supabase) return [];
      
      let query = supabase
        .from("okr_initiatives")
        .select(INITIATIVE_FIELDS)
        .is("deleted_at", null);

      if (buId) {
        query = query.eq("bu_id", buId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(100);

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
    staleTime: 2 * 60 * 1000,
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
      // Invalidate all initiatives queries with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiatives(variables.kr_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByUser(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByStatus(null), refetchType: 'active' });
      // Invalidate team KRs since initiatives affect KR display
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
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
      // Invalidate all initiatives queries with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll(), refetchType: 'active' });
      // Also invalidate the specific KR initiatives list
      if (data?.kr_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiatives(data.kr_id), refetchType: 'active' });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByUser(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByStatus(null), refetchType: 'active' });
      // Invalidate team KRs since initiatives affect KR display
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      toast.success("Iniciativa atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar iniciativa");
    },
  });
}

// Delete initiative (soft delete) with optimistic update
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
      return { krId, initiativeId };
    },
    // Optimistic update: remove from list immediately
    onMutate: async ({ initiativeId, krId }) => {
      const queryKey = queryKeys.okrs.initiatives(krId);
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<Initiative[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData.filter((i) => i.id !== initiativeId));
      }
      
      return { previousData, queryKey };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error("Erro ao remover iniciativa");
    },
    onSuccess: (data) => {
      // Invalidate all initiatives queries with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiatives(data.krId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByUser(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByStatus(null), refetchType: 'active' });
      // Invalidate team KRs since initiatives affect KR display
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      toast.success("Iniciativa removida");
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
      // Invalidate all initiatives queries with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByUser(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesByStatus(null), refetchType: 'active' });
      // Invalidate team KRs since initiatives affect KR display
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}
