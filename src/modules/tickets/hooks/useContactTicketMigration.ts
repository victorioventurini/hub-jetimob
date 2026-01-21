/**
 * Hooks for contact ticket migration
 * 
 * Used when removing external contacts that have open tickets
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// Status that are considered "open" (not finalized)
const OPEN_STATUSES = ["waiting", "in_progress", "paused"] as const;

interface PendingTicket {
  id: string;
  title: string | null;
  status: string;
}

/**
 * Get all pending (non-finalized) tickets assigned to a contact
 */
export function usePendingTicketsForContact(contactId: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.tickets.pendingForContact(contactId),
    queryFn: async (): Promise<PendingTicket[]> => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, status")
        .eq("assigned_contact_id", contactId)
        .in("status", OPEN_STATUSES)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });
}

interface MigrateAndRemoveParams {
  contactId: string;
  targetContactId?: string;
  ticketIds: string[];
}

/**
 * Migrate tickets to another contact and remove the original contact
 */
export function useMigrateAndRemoveContact() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({ contactId, targetContactId, ticketIds }: MigrateAndRemoveParams) => {
      if (!buId) throw new Error("BU não selecionada");
      
      // 1. If there are tickets to migrate, update them first
      if (ticketIds.length > 0 && targetContactId) {
        const { error: migrateError } = await supabase
          .from("tickets")
          .update({ 
            assigned_contact_id: targetContactId,
            updated_at: new Date().toISOString(),
          })
          .in("id", ticketIds);
        
        if (migrateError) {
          throw new Error(`Erro ao migrar tickets: ${migrateError.message}`);
        }
      }
      
      // 2. Soft delete the contact
      const { error: deleteError } = await supabase
        .from("partner_contacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", contactId);
      
      if (deleteError) {
        throw new Error(`Erro ao remover contato: ${deleteError.message}`);
      }
      
      // 3. Deactivate BU association
      const { error: assocError } = await supabase
        .from("partner_contact_bu_associations")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("partner_contact_id", contactId)
        .eq("bu_id", buId);
      
      if (assocError) {
        console.warn("Failed to deactivate association:", assocError);
        // Don't fail the operation, contact was already deleted
      }
      
      return {
        migratedCount: ticketIds.length,
        targetContactId,
      };
    },
    onSuccess: (result) => {
      if (result.migratedCount > 0) {
        toast.success(`${result.migratedCount} ticket(s) migrado(s) e contato removido`);
      } else {
        toast.success("Contato removido com sucesso");
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.list(buId ?? null),
        exact: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover contato");
    },
  });
}
