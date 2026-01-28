import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { TicketRoutingRule } from "../types";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

export function useRoutingRules() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.routingRules(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - routing rules change rarely
    queryFn: async () => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("ticket_routing_rules")
        .select("id, bu_id, external_company_id, subcategory_id, assignee_contact_ids, watcher_contact_ids, notes, created_at, created_by, updated_at, deleted_at")
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
  const supabase = useBuScopedSupabase();

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
  const supabase = useBuScopedSupabase();

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
      // Sanitize UUID fields: convert empty strings to null
      const sanitizedData = {
        ...data,
        ...(data.partner_company_id !== undefined && {
          partner_company_id: data.partner_company_id || null,
        }),
        ...(data.subcategory_id !== undefined && {
          subcategory_id: data.subcategory_id || null,
        }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("ticket_routing_rules")
        .update(sanitizedData as any)
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
  const supabase = useBuScopedSupabase();

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
