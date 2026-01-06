import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { TicketMessage, CreateMessageData } from "../types";

// ===========================================
// QUERIES
// ===========================================

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.messages(ticketId ?? ''),
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("ticket_messages")
        .select(`
          *,
          author_contact:partner_contacts(id, name, email)
        `)
        .eq("ticket_id", ticketId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data as unknown as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}

// ===========================================
// MUTATIONS
// ===========================================

export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: CreateMessageData;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create message
      const { data: message, error } = await supabase
        .from("ticket_messages")
        .insert({
          bu_id: buId,
          ticket_id: ticketId,
          author_type: "internal_user" as const,
          author_user_id: user.id,
          body_richtext: data.body_richtext,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at
      await supabase
        .from("tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      // Create mentions if provided
      if (data.mentions && data.mentions.length > 0) {
        const mentionInserts = data.mentions
          .filter((m) => m.user_id || m.contact_id)
          .map((m) => ({
            bu_id: buId,
            ticket_id: ticketId,
            message_id: message.id,
            mentioned_user_id: m.user_id || null,
            mentioned_contact_id: m.contact_id || null,
          }));

        if (mentionInserts.length > 0) {
          await supabase.from("ticket_mentions").insert(mentionInserts);
        }
      }

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-messages", variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.ticketId],
      });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body_richtext,
    }: {
      id: string;
      body_richtext: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .update({
          body_richtext: body_richtext as any,
          edited_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("ticket_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.ticket_id) {
        queryClient.invalidateQueries({
          queryKey: ["ticket-messages", data.ticket_id],
        });
      }
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select("ticket_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.ticket_id) {
        queryClient.invalidateQueries({
          queryKey: ["ticket-messages", data.ticket_id],
        });
      }
    },
  });
}
