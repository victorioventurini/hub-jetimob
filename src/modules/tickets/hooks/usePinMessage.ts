/**
 * usePinMessage - Hook para fixar/desafixar mensagens em tickets
 * 
 * Regras de permissão (validadas também no backend via trigger):
 * - Apenas created_by_user_id ou owner_user_id do ticket podem fixar
 * - Para tickets externos, o assigned_contact também pode fixar
 * 
 * @see docs/IDENTITY_CONVENTION.md - profileId para campos de domínio
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// ===========================================
// TYPES
// ===========================================

export interface PinMessageParams {
  messageId: string;
  ticketId: string;
  pin: boolean;
}

// ===========================================
// PERMISSION HELPER
// ===========================================

/**
 * Verifica se o usuário pode fixar mensagens neste ticket
 * @param ticket - Dados do ticket
 * @param profileId - ID do profile do usuário atual
 * @param contactId - ID do contato externo (se aplicável)
 * @param isAdmin - Override: true quando o usuário é admin/super_admin (wildcard ou tickets.settings.manage:bu).
 *                  Espelha o admin override de can_update_ticket_status / can_pin_ticket_message no banco.
 */
export function canUserPinMessages(
  ticket: {
    created_by_user_id: string;
    owner_user_id: string | null;
    assigned_contact_id?: string | null;
    type: "internal" | "external";
  },
  profileId: string | null,
  contactId?: string | null,
  isAdmin: boolean = false
): boolean {
  if (!profileId) return false;

  // Admin override (canônico via permission key — ver PERMISSIONS_AND_RBAC_MODEL.md)
  if (isAdmin) return true;

  // Criador ou owner podem fixar
  if (ticket.created_by_user_id === profileId) return true;
  if (ticket.owner_user_id === profileId) return true;

  // Para tickets externos, o contato assignee também pode
  if (ticket.type === "external" && contactId && ticket.assigned_contact_id === contactId) {
    return true;
  }

  return false;
}

// ===========================================
// HOOK
// ===========================================

export function usePinMessage() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ messageId, ticketId, pin }: PinMessageParams) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data, error } = await buScopedSupabase
        .from("ticket_messages")
        .update({ is_pinned: pin })
        .eq("id", messageId)
        .eq("ticket_id", ticketId)
        .select("id, is_pinned")
        .single();

      if (error) {
        // O trigger validate_message_pin retorna erro se não tiver permissão
        if (error.message.includes("apenas o criador") || error.message.includes("responsável")) {
          throw new Error("Você não tem permissão para fixar mensagens neste ticket");
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.messages(variables.ticketId),
        refetchType: "active",
      });
      toast.success(variables.pin ? "Mensagem fixada" : "Mensagem desafixada");
    },
    onError: (error: Error) => {
      console.error("[usePinMessage] Error:", error);
      toast.error(error.message || "Erro ao fixar/desafixar mensagem");
    },
  });
}
