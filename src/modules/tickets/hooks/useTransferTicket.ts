/**
 * useTransferTicket - Hook para transferir ticket para outro responsável
 * 
 * - Ticket interno: transfere para outro usuário interno (owner_user_id)
 * - Ticket externo: transfere para outro contato externo da mesma empresa (assigned_contact_id)
 * 
 * Ações:
 * 1. Atualiza o responsável no ticket
 * 2. Cria mensagem de sistema no histórico
 * 3. Emite notificação para o novo responsável
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ===========================================
// TYPES
// ===========================================

export interface TransferTicketParams {
  ticketId: string;
  ticketTitle: string;
  ticketType: "internal" | "external";
  /** Current responsible info for the transfer message */
  fromResponsible: {
    type: "internal" | "external";
    id: string;
    name: string;
  };
  /** New responsible info */
  toResponsible: {
    type: "internal" | "external";
    id: string;
    name: string;
    /** Auth user_id for notification (profiles.user_id or partner_contacts.profile_user_id) */
    authUserId?: string | null;
  };
}

// ===========================================
// HOOK
// ===========================================

export function useTransferTicket(transferredByProfileId: string | null, transferredByAuthUserId: string | null) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (params: TransferTicketParams) => {
      if (!buId) throw new Error("BU não selecionada");
      if (!transferredByProfileId) throw new Error("Perfil não carregado");

      const { ticketId, ticketTitle, ticketType, fromResponsible, toResponsible } = params;

      // Validate transfer type matches ticket type
      if (ticketType === "internal" && toResponsible.type !== "internal") {
        throw new Error("Tickets internos só podem ser transferidos para usuários internos");
      }
      if (ticketType === "external" && toResponsible.type !== "external") {
        throw new Error("Tickets externos só podem ser transferidos para contatos externos");
      }

      // 1. Update ticket with new responsible
      const updatePayload = ticketType === "internal"
        ? { owner_user_id: toResponsible.id, updated_at: new Date().toISOString() }
        : { assigned_contact_id: toResponsible.id, updated_at: new Date().toISOString() };

      const { error: updateError } = await buScopedSupabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // 2. Get the name of who is transferring
      const { data: transferrer } = await buScopedSupabase
        .from("profiles")
        .select("display_name")
        .eq("id", transferredByProfileId)
        .single();

      const transferrerName = transferrer?.display_name || "Alguém";
      const now = new Date();
      const formattedDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // 3. Create system message in ticket history
      const systemMessage = `📋 Ticket transferido de **${fromResponsible.name}** para **${toResponsible.name}** por **${transferrerName}**. ${formattedDate}`;

      const { error: messageError } = await buScopedSupabase
        .from("ticket_messages")
        .insert({
          bu_id: buId,
          ticket_id: ticketId,
          author_type: "system" as any,
          author_user_id: transferredByProfileId,
          body_richtext: {
            type: "system",
            content: systemMessage,
          },
        } as any);

      if (messageError) {
        console.error("[useTransferTicket] Error creating system message:", messageError);
        // Don't fail the transfer if message creation fails
      }

      // 4. Update ticket_participants for external tickets
      if (ticketType === "external") {
        // Remove old assignee participant
        await buScopedSupabase
          .from("ticket_participants")
          .delete()
          .eq("ticket_id", ticketId)
          .eq("partner_contact_id", fromResponsible.id)
          .eq("role", "assignee");

        // Add new assignee participant
        await buScopedSupabase
          .from("ticket_participants")
          .insert({
            bu_id: buId,
            ticket_id: ticketId,
            participant_type: "partner_contact" as const,
            partner_contact_id: toResponsible.id,
            role: "assignee" as const,
          });
      }

      // 5. Emit notification to new responsible
      if (toResponsible.authUserId) {
        try {
          await supabase.rpc("emit_notification_event", {
            p_event_slug: "ticket.assigned",
            p_bu_id: buId,
            p_recipient_user_ids: [toResponsible.authUserId],
            p_actor_id: transferredByAuthUserId, // auth.users.id do usuário que transferiu
            p_title: `${transferrerName} transferiu um ticket para você`,
            p_message: ticketTitle,
            p_context_type: "ticket",
            p_context_id: ticketId,
            p_context_url: `/go/ticket/${ticketId}`,
            p_metadata: {
              ticket_id: ticketId,
              from_name: fromResponsible.name,
              to_name: toResponsible.name,
              transferred_by: transferrerName,
            },
          });
        } catch (notifError) {
          console.error("[useTransferTicket] Error sending notification:", notifError);
          // Don't fail the transfer if notification fails
        }
      }

      return { ticketId, toResponsible };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(result.ticketId),
        refetchType: "active",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.messages(result.ticketId),
        refetchType: "active",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.listPrefix(buId ?? null),
        refetchType: "active",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.myTicketsPrefix(buId ?? null),
        refetchType: "active",
      });
      toast.success(`Ticket transferido para ${result.toResponsible.name}`);
    },
    onError: (error: Error) => {
      console.error("[useTransferTicket] Error:", error);
      toast.error("Erro ao transferir ticket: " + (error.message || "Erro desconhecido"));
    },
  });
}
