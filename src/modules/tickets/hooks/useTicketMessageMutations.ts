import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import type { CreateMessageData } from "../types";

// NOTA: Este módulo usa profiles.id para author_user_id (identity convention)
// Ver docs/engineering/IDENTITY_CONVENTION.md para detalhes

// ===========================================
// TYPES
// ===========================================

export interface CreateMessageAuthor {
  profileId: string | null;
  /** If the user is an external contact, this is their partner_contacts.id */
  contactId?: string | null;
}

// ===========================================
// MUTATIONS
// ===========================================

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
      
      // Validate author identity
      if (!isExternalUser && !author.profileId) {
        throw new Error("Perfil não carregado");
      }
      
      if (isExternalUser && !author.contactId) {
        throw new Error("Contato externo não encontrado para esta BU");
      }

      // Build message payload based on author type
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

      // Create mentions if provided
      if (data.mentions && data.mentions.length > 0) {
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
        await uploadAttachments({
          buId,
          ticketId,
          messageId: message.id,
          files: data.attachments,
          uploadedByUserId: isExternalUser ? null : author.profileId,
          buScopedSupabase,
        });
      }

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.messages(variables.ticketId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.attachments(variables.ticketId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(variables.ticketId),
        refetchType: 'active',
      });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      body_richtext,
    }: {
      id: string;
      body_richtext: Record<string, unknown>;
    }) => {
      const { data, error } = await buScopedSupabase
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
          refetchType: 'active',
        });
      }
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await buScopedSupabase
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
          refetchType: 'active',
        });
      }
    },
  });
}

// ===========================================
// HELPERS
// ===========================================

interface UploadAttachmentsParams {
  buId: string;
  ticketId: string;
  messageId: string;
  files: File[];
  uploadedByUserId: string | null;
  buScopedSupabase: ReturnType<typeof useBuScopedSupabase>;
}

async function uploadAttachments({
  buId,
  ticketId,
  messageId,
  files,
  uploadedByUserId,
  buScopedSupabase,
}: UploadAttachmentsParams) {
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${buId}/${ticketId}/${messageId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    // Upload to storage using global client (RLS handles auth)
    // See docs/engineering/BU_SCOPED_SUPABASE_RULES.md for storage exception
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
    await buScopedSupabase.from("ticket_attachments").insert({
      bu_id: buId,
      ticket_id: ticketId,
      message_id: messageId,
      file_url: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by_user_id: uploadedByUserId,
    });
  }
}
