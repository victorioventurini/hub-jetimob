// ============================================================
// HOOK: useInternalRoutingRules
// Gerenciamento de regras de roteamento interno de tickets
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { TicketInternalRoutingRule } from "../types";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================
// READ
// ============================================================

export function useInternalRoutingRules() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.tickets.internalRoutingRules(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - routing rules change rarely
    queryFn: async () => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("ticket_internal_routing_rules")
        .select(`
          id,
          bu_id,
          category_id,
          subcategory_id,
          assignee_user_ids,
          assignee_team_ids,
          assignee_squad_ids,
          watcher_user_ids,
          watcher_team_ids,
          watcher_squad_ids,
          priority,
          notes,
          created_at,
          created_by,
          updated_at,
          deleted_at,
          category:ticket_categories!category_id(id, name, scope),
          subcategory:ticket_subcategories!subcategory_id(
            id,
            name,
            category:ticket_categories!category_id(id, name, scope)
          )
        `)
        .is("deleted_at", null)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TicketInternalRoutingRule[];
    },
    enabled: !!buId,
  });
}

// ============================================================
// CREATE
// ============================================================

interface CreateInternalRoutingRuleData {
  category_id?: string | null;
  subcategory_id?: string | null;
  assignee_user_ids?: string[];
  assignee_team_ids?: string[];
  assignee_squad_ids?: string[];
  watcher_user_ids?: string[];
  watcher_team_ids?: string[];
  watcher_squad_ids?: string[];
  priority?: number;
  notes?: string | null;
}

export function useCreateInternalRoutingRule() {
  const { currentBu } = useBu();
  const { profile } = useAuth();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInternalRoutingRuleData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");

      const { data: result, error } = await supabase
        .from("ticket_internal_routing_rules")
        .insert({
          bu_id: currentBu.id,
          category_id: data.category_id || null,
          subcategory_id: data.subcategory_id || null,
          assignee_user_ids: data.assignee_user_ids || [],
          assignee_team_ids: data.assignee_team_ids || [],
          assignee_squad_ids: data.assignee_squad_ids || [],
          watcher_user_ids: data.watcher_user_ids || [],
          watcher_team_ids: data.watcher_team_ids || [],
          watcher_squad_ids: data.watcher_squad_ids || [],
          priority: data.priority ?? 100,
          notes: data.notes || null,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.internalRoutingRules(currentBu?.id ?? null) 
      });
      toast.success("Regra de roteamento interno criada");
    },
    onError: (error) => {
      console.error("Error creating internal routing rule:", error);
      toast.error("Erro ao criar regra de roteamento interno");
    },
  });
}

// ============================================================
// UPDATE
// ============================================================

interface UpdateInternalRoutingRuleData {
  id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  assignee_user_ids?: string[];
  assignee_team_ids?: string[];
  assignee_squad_ids?: string[];
  watcher_user_ids?: string[];
  watcher_team_ids?: string[];
  watcher_squad_ids?: string[];
  priority?: number;
  notes?: string | null;
}

export function useUpdateInternalRoutingRule() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateInternalRoutingRuleData) => {
      const { error } = await supabase
        .from("ticket_internal_routing_rules")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.internalRoutingRules(currentBu?.id ?? null) 
      });
      toast.success("Regra de roteamento interno atualizada");
    },
    onError: (error) => {
      console.error("Error updating internal routing rule:", error);
      toast.error("Erro ao atualizar regra de roteamento interno");
    },
  });
}

// ============================================================
// DELETE (soft)
// ============================================================

export function useDeleteInternalRoutingRule() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_internal_routing_rules")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.internalRoutingRules(currentBu?.id ?? null) 
      });
      toast.success("Regra de roteamento interno removida");
    },
    onError: (error) => {
      console.error("Error deleting internal routing rule:", error);
      toast.error("Erro ao remover regra de roteamento interno");
    },
  });
}
