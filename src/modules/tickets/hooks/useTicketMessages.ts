import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import type { TicketMessage, TicketAttachment, CreateMessageData } from "../types";

// NOTA: Este módulo usa profiles.id para author_user_id (identity convention)
// Ver docs/IDENTITY_CONVENTION.md para detalhes

// ===========================================
// QUERIES
// ===========================================

export function useTicketMessages(ticketId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.messages(ticketId ?? ''),
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

export function useTicketAttachments(ticketId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["ticket-attachments", ticketId],
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

// ===========================================
// MUTATIONS
// ===========================================

export function useCreateMessage(profileId: string | null) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: CreateMessageData;
    }) => {
      if (!buId) throw new Error("BU não selecionada");
      if (!profileId) throw new Error("Perfil não carregado");

      // Create message with profileId (profiles.id)
      const { data: message, error } = await buScopedSupabase
        .from("ticket_messages")
        .insert({
          bu_id: buId,
          ticket_id: ticketId,
          author_type: "internal_user" as const,
          author_user_id: profileId,
          body_richtext: data.body_richtext,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at
      await buScopedSupabase
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
          await buScopedSupabase.from("ticket_mentions").insert(mentionInserts);
        }
      }

      // Upload attachments if provided
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${buId}/${ticketId}/${message.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          // Upload to storage using global client (RLS handles auth)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error("Failed to upload file:", uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(uploadData.path);

          // Insert attachment record
          await buScopedSupabase.from("ticket_attachments").insert({
            bu_id: buId,
            ticket_id: ticketId,
            message_id: message.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: profileId,
          });
        }
      }

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.messages(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket-attachments", variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(variables.ticketId),
      });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

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
          queryKey: queryKeys.tickets.messages(data.ticket_id),
        });
      }
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

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
          queryKey: queryKeys.tickets.messages(data.ticket_id),
        });
      }
    },
  });
}
