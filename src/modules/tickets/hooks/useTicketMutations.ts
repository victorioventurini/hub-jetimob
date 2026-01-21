/**
 * Ticket Mutation Hooks
 * 
 * React Query mutations for creating, updating, and deleting tickets.
 * Follows project standards: refetchType: 'active', profileId for identity.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type {
  CreateTicketData,
  UpdateTicketData,
  TicketStatus,
} from "../types";

// ===========================================
// CREATE MUTATION
// ===========================================

export function useCreateTicket(profileId: string | null) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      if (!buId) throw new Error("BU não selecionada");
      if (!profileId) throw new Error("Perfil não carregado");

      // Create ticket with profileId (profiles.id)
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          bu_id: buId,
          type: data.type,
          title: data.title,
          category_id: data.category_id || null,
          subcategory_id: data.subcategory_id || null,
          partner_company_id: data.partner_company_id || null,
          // External contact assignment (contact-first routing v2.4+)
          assigned_contact_id: data.assigned_contact_id || null,
          assignment_source: data.assignment_source || null,
          visibility: data.visibility,
          visibility_team_ids: data.visibility_team_ids || [],
          visibility_squad_ids: data.visibility_squad_ids || [],
          visibility_user_ids: data.visibility_user_ids || [],
          expected_due_at: data.expected_due_at || null,
          created_by_user_id: profileId,
          owner_user_id: profileId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as requester participant with profileId
      await supabase.from("ticket_participants").insert({
        bu_id: buId,
        ticket_id: ticket.id,
        participant_type: "internal_user" as const,
        user_id: profileId,
        role: "requester" as const,
      });

      // If external contact is assigned, add as participant with assignee role
      if (data.assigned_contact_id) {
        await supabase.from("ticket_participants").insert({
          bu_id: buId,
          ticket_id: ticket.id,
          participant_type: "partner_contact" as const,
          partner_contact_id: data.assigned_contact_id,
          role: "assignee" as const,
        });
      }

      // Add initial message if provided with profileId
      if (data.initial_message && Object.keys(data.initial_message).length > 0) {
        const { data: message, error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            bu_id: buId,
            ticket_id: ticket.id,
            author_type: "internal_user" as const,
            author_user_id: profileId,
            body_richtext: data.initial_message,
          } as any)
          .select("id")
          .single();

        // Insert mentions for initial message (using global mentions table)
        if (!messageError && message && data.initial_message_mentions && data.initial_message_mentions.length > 0) {
          const mentionInserts = data.initial_message_mentions
            .filter((m) => m.user_id || m.contact_id)
            .map((m) => ({
              bu_id: buId,
              entity_type: "ticket_message" as const,
              entity_id: message.id,
              mentioned_user_id: m.user_id || null,
              mentioned_contact_id: m.contact_id || null,
              created_by: profileId,
            }));

          if (mentionInserts.length > 0) {
            await supabase.from("mentions").insert(mentionInserts);
          }
        }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId ?? null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId ?? null), refetchType: 'active' });
    },
    onError: (error: Error) => {
      console.error("[useCreateTicket] Error:", error);
      toast.error("Erro ao criar ticket: " + (error.message || "Erro desconhecido"));
    },
  });
}

// ===========================================
// UPDATE MUTATION
// ===========================================

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: UpdateTicketData & { id: string }) => {
      // Sanitize UUID fields: convert empty strings to null
      const sanitizedData = {
        ...data,
        ...(data.category_id !== undefined && {
          category_id: data.category_id || null,
        }),
        ...(data.subcategory_id !== undefined && {
          subcategory_id: data.subcategory_id || null,
        }),
        ...(data.owner_user_id !== undefined && {
          owner_user_id: data.owner_user_id || null,
        }),
        updated_at: new Date().toISOString(),
      };

      const { data: ticket, error } = await supabase
        .from("tickets")
        .update(sanitizedData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id), refetchType: 'active' });
    },
  });
}

// ===========================================
// STATUS UPDATE MUTATION
// ===========================================

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();

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
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id), refetchType: 'active' });
    },
  });
}

// ===========================================
// DELETE MUTATION
// ===========================================

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId), refetchType: 'active' });
    },
  });
}
