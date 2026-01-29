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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  CreateTicketData,
  UpdateTicketData,
  TicketStatus,
} from "../types";

// ===========================================
// CONSTANTS
// ===========================================

const STATUS_LABELS: Record<TicketStatus, string> = {
  waiting: "Aguardando",
  paused: "Pausado",
  in_progress: "Em Andamento",
  done: "Concluído",
  discarded: "Descartado",
};

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

      // Debug guard: confirm we never send legacy column names to PostgREST
      // (This is the exact error the user is seeing)
      console.debug("[useCreateTicket] input", {
        type: data.type,
        partner_company_id: data.partner_company_id ?? null,
        assigned_contact_id: data.assigned_contact_id ?? null,
        category_id: data.category_id ?? null,
        subcategory_id: data.subcategory_id ?? null,
        buId,
        profileId,
      });

      const insertPayload = {
        bu_id: buId,
        type: data.type,
        title: data.title,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        // Unified external company model (TCR v2.73+)
        external_company_id: data.partner_company_id || null,
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
      } as const;

      // If this ever becomes true, we found the culprit.
      console.debug("[useCreateTicket] insertPayload keys", Object.keys(insertPayload));
      console.debug("[useCreateTicket] legacy column present?", {
        has_partner_company_id: Object.prototype.hasOwnProperty.call(insertPayload, "partner_company_id"),
      });

      // Create ticket with profileId (profiles.id)
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Add creator as requester participant with profileId
      await supabase.from("ticket_participants").insert({
        bu_id: buId,
        ticket_id: ticket.id,
        participant_type: "internal_user" as const,
        profile_id: profileId,
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
      // Check if there's actual content (not just empty text)
      const hasInitialMessage = data.initial_message && 
        typeof data.initial_message === 'object' &&
        'content' in data.initial_message &&
        typeof data.initial_message.content === 'string' &&
        data.initial_message.content.trim().length > 0;
      
      // Also check if we need to create a message for attachments
      const hasAttachments = data.attachments && data.attachments.length > 0;
      const shouldCreateMessage = hasInitialMessage || hasAttachments;
      
      if (shouldCreateMessage) {
        const messageContent = hasInitialMessage 
          ? data.initial_message 
          : { type: "text", content: "" }; // Empty message for attachment-only case
          
        const { data: message, error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            bu_id: buId,
            ticket_id: ticket.id,
            author_type: "internal_user" as const,
            author_user_id: profileId,
            body_richtext: messageContent,
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
          profile_id: p.type === "internal_user" ? p.id : null,
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

/** Context for inserting system message on status change */
export interface StatusChangeContext {
  currentStatus: TicketStatus;
  profileId: string | null;
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      context,
    }: {
      id: string;
      status: TicketStatus;
      /** Context for inserting system message */
      context?: StatusChangeContext;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("bu_id")
        .single();

      if (error) throw error;

      // Insert system message recording the status change
      if (context && context.currentStatus !== status && ticket?.bu_id) {
        const formattedDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const oldStatusLabel = STATUS_LABELS[context.currentStatus];
        const newStatusLabel = STATUS_LABELS[status];
        const systemMessage = `🔄 Status alterado de **${oldStatusLabel}** para **${newStatusLabel}**. ${formattedDate}`;

        await supabase
          .from("ticket_messages")
          .insert({
            bu_id: ticket.bu_id,
            ticket_id: id,
            author_type: "system" as any,
            author_user_id: context.profileId,
            body_richtext: {
              type: "system",
              content: systemMessage,
            },
          } as any);
      }

      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.messages(variables.id), refetchType: 'active' });
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
