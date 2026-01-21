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
          author_user:profiles!author_user_id(id, display_name, photo_url),
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

// ===========================================
// MUTATIONS
// ===========================================

export interface CreateMessageAuthor {
  profileId: string | null;
  /** If the user is an external contact, this is their partner_contacts.id */
  contactId?: string | null;
}

export function useCreateMessage(author: CreateMessageAuthor) {
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
      
      const isExternalUser = !!author.contactId;
      
      // Validar que temos um ID de autor válido
      if (!isExternalUser && !author.profileId) {
        throw new Error("Perfil não carregado");
      }
      
      if (isExternalUser && !author.contactId) {
        throw new Error("Contato externo não encontrado para esta BU");
      }

      // Determine author type and ID based on user type
      const messagePayload = isExternalUser
        ? {
            bu_id: buId,
            ticket_id: ticketId,
            author_type: "partner_contact" as const,
            author_contact_id: author.contactId,
            body_richtext: data.body_richtext,
          }
        : {
            bu_id: buId,
            ticket_id: ticketId,
            author_type: "internal_user" as const,
            author_user_id: author.profileId,
            body_richtext: data.body_richtext,
          };

      // Create message
      const { data: message, error } = await buScopedSupabase
        .from("ticket_messages")
        .insert(messagePayload as any)
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at
      await buScopedSupabase
        .from("tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      // Create mentions if provided (using global mentions table)
      if (data.mentions && data.mentions.length > 0) {
        // For external users, use their contactId; for internal users, use profileId
        const createdBy = isExternalUser ? null : author.profileId;
        
        const mentionInserts = data.mentions
          .filter((m) => m.user_id || m.contact_id)
          .map((m) => ({
            bu_id: buId,
            entity_type: "ticket_message" as const,
            entity_id: message.id,
            mentioned_user_id: m.user_id || null,
            mentioned_contact_id: m.contact_id || null,
            created_by: createdBy,
          }));

        if (mentionInserts.length > 0) {
          await buScopedSupabase.from("mentions").insert(mentionInserts);
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

          // Store the storage path (not public URL since bucket is private)
          // Files will be accessed via signed URLs when displayed
          const storagePath = uploadData.path;

          // Insert attachment record with storage path
          // For external users, uploaded_by_user_id is null (they don't have a profile)
          await buScopedSupabase.from("ticket_attachments").insert({
            bu_id: buId,
            ticket_id: ticketId,
            message_id: message.id,
            file_url: storagePath, // Store path, not URL
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: isExternalUser ? null : author.profileId,
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
        queryKey: queryKeys.tickets.attachments(variables.ticketId),
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
