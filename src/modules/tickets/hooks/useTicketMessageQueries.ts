import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";
import type { TicketMessage, TicketAttachment } from "../types";

// NOTA: Este módulo usa profiles.id para author_user_id (identity convention)
// Ver docs/engineering/IDENTITY_CONVENTION.md para detalhes

/**
 * Fetches messages for a specific ticket.
 * Messages are ordered by creation date (ascending).
 */
export function useTicketMessages(ticketId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.messages(ticketId ?? ''),
    staleTime: 30 * 1000, // 30 seconds - messages update frequently
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await buScopedSupabase
        .from("ticket_messages")
        .select(`
          id,
          bu_id,
          ticket_id,
          author_type,
          author_user_id,
          author_contact_id,
          body_richtext,
          created_at,
          edited_at,
          deleted_at,
          is_pinned,
          pinned_at,
          pinned_by_user_id,
          author_user:profiles!author_user_id(id, display_name, photo_url),
          author_contact:partner_contacts(id, name, email),
          pinned_by:profiles!pinned_by_user_id(id, display_name)
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

/**
 * Fetches attachments for a specific ticket.
 * Attachments are stored in private bucket; use useAttachmentUrl for signed URLs.
 */
export function useTicketAttachments(ticketId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.attachments(ticketId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await buScopedSupabase
        .from("ticket_attachments")
        .select(`
          id,
          bu_id,
          ticket_id,
          message_id,
          file_url,
          file_name,
          file_size,
          mime_type,
          uploaded_by_user_id,
          created_at,
          deleted_at
        `)
        .eq("ticket_id", ticketId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data as unknown as TicketAttachment[];
    },
    enabled: !!ticketId,
  });
}
