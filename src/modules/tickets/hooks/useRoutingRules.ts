import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { TicketRoutingRule } from "../types";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

export function useRoutingRules() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.tickets.routingRules(buId ?? null),
    queryFn: async () => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("ticket_routing_rules")
        .select("*")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TicketRoutingRule[];
    },
    enabled: !!buId,
  });
}

export function useCreateRoutingRule() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      partner_company_id: string;
      subcategory_id: string;
      assignee_contact_ids?: string[];
      watcher_contact_ids?: string[];
      notes?: string | null;
    }) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: result, error } = await supabase
        .from("ticket_routing_rules")
        .insert({
          bu_id: currentBu.id,
          partner_company_id: data.partner_company_id,
          subcategory_id: data.subcategory_id,
          assignee_contact_ids: data.assignee_contact_ids || [],
          watcher_contact_ids: data.watcher_contact_ids || [],
          notes: data.notes || null,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.routingRules(currentBu?.id ?? null) });
      toast.success("Regra de roteamento criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating routing rule:", error);
      toast.error("Erro ao criar regra de roteamento");
    },
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      partner_company_id?: string;
      subcategory_id?: string;
      assignee_contact_ids?: string[];
      watcher_contact_ids?: string[];
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("ticket_routing_rules")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.routingRules(null) });
      toast.success("Regra de roteamento atualizada");
    },
    onError: (error) => {
      console.error("Error updating routing rule:", error);
      toast.error("Erro ao atualizar regra de roteamento");
    },
  });
}

export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_routing_rules")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.routingRules(null) });
      toast.success("Regra de roteamento removida");
    },
    onError: (error) => {
      console.error("Error deleting routing rule:", error);
      toast.error("Erro ao remover regra de roteamento");
    },
  });
}
