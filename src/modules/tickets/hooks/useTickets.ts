import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import type {
  Ticket,
  TicketFilters,
  CreateTicketData,
  UpdateTicketData,
  TicketStatus,
} from "../types";

// ===========================================
// QUERIES
// ===========================================

export function useTickets(filters?: TicketFilters) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["tickets", buId, filters],
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("tickets")
        .select(`
          *,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters?.subcategory_id) {
        query = query.eq("subcategory_id", filters.subcategory_id);
      }

      if (filters?.partner_company_id) {
        query = query.eq("partner_company_id", filters.partner_company_id);
      }

      if (filters?.owner_user_id) {
        query = query.eq("owner_user_id", filters.owner_user_id);
      }

      if (filters?.created_by_user_id) {
        query = query.eq("created_by_user_id", filters.created_by_user_id);
      }

      if (filters?.overdue) {
        query = query
          .lt("expected_due_at", new Date().toISOString())
          .not("status", "in", "(done,discarded)");
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Ticket[];
    },
    enabled: !!buId,
  });
}

export function useTicket(ticketId: string | null) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          participants:ticket_participants(
            id,
            participant_type,
            user_id,
            partner_contact_id,
            role,
            is_active
          )
        `)
        .eq("id", ticketId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as Ticket | null;
    },
    enabled: !!ticketId && !!buId,
  });
}

export function useMyTickets() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["my-tickets", buId],
    queryFn: async () => {
      if (!buId) return [];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          category:ticket_categories(id, name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or(`created_by_user_id.eq.${user.id},owner_user_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data as Ticket[];
    },
    enabled: !!buId,
  });
}

// ===========================================
// MUTATIONS
// ===========================================

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create ticket
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          bu_id: buId,
          type: data.type,
          title: data.title,
          category_id: data.category_id || null,
          subcategory_id: data.subcategory_id || null,
          partner_company_id: data.partner_company_id || null,
          visibility: data.visibility,
          visibility_team_ids: data.visibility_team_ids || [],
          visibility_squad_ids: data.visibility_squad_ids || [],
          visibility_user_ids: data.visibility_user_ids || [],
          expected_due_at: data.expected_due_at || null,
          created_by_user_id: user.id,
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as requester participant
      await supabase.from("ticket_participants").insert({
        bu_id: buId,
        ticket_id: ticket.id,
        participant_type: "internal_user" as const,
        user_id: user.id,
        role: "requester" as const,
      });

      // Add initial message if provided
      if (data.initial_message && Object.keys(data.initial_message).length > 0) {
        await supabase.from("ticket_messages").insert({
          bu_id: buId,
          ticket_id: ticket.id,
          author_type: "internal_user" as const,
          author_user_id: user.id,
          body_richtext: data.initial_message,
        } as any);
      }

      // Add additional participants
      if (data.participants && data.participants.length > 0) {
        const participantInserts = data.participants.map((p) => ({
          bu_id: buId,
          ticket_id: ticket.id,
          participant_type: p.type,
          user_id: p.type === "internal_user" ? p.id : null,
          partner_contact_id: p.type === "partner_contact" ? p.id : null,
          role: p.role,
        }));

        await supabase.from("ticket_participants").insert(participantInserts);
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: UpdateTicketData & { id: string }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TicketStatus;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
}
