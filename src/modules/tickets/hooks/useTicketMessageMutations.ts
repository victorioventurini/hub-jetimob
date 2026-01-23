import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/globalClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CreateMessageData, TicketStatus, TicketType } from "../types";

// NOTA: Este módulo usa profiles.id para author_user_id (identity convention)
// Ver docs/canonical/IDENTITY_CONVENTION.md para detalhes

// ===========================================
// TYPES
// ===========================================

export interface CreateMessageAuthor {
  profileId: string | null;
  /** If the user is an external contact, this is their partner_contacts.id */
  contactId?: string | null;
}

/** Context for auto-status change when responsible sends message */
export interface TicketContext {
  type: TicketType;
  status: TicketStatus;
  /** profiles.id of the owner (internal tickets) */
  owner_user_id: string | null;
  /** partner_contacts.id of the assignee (external tickets) */
  assigned_contact_id: string | null;
}

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
// MUTATIONS
// ===========================================

export function useCreateMessage(author: CreateMessageAuthor, ticketContext?: TicketContext) {
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

      // Guard: ensure the request is authenticated before hitting RLS/BU-context functions.
      // This prevents opaque DB errors like NO_BU_CONTEXT when the session expired.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("NOT_AUTHENTICATED");
      
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
            reply_to_message_id: data.reply_to_message_id ?? null,
          }
        : {
            bu_id: buId,
            ticket_id: ticketId,
            author_type: "internal_user" as const,
            author_user_id: author.profileId,
            body_richtext: data.body_richtext,
            reply_to_message_id: data.reply_to_message_id ?? null,
          };

      // Create message
      const { data: message, error } = await buScopedSupabase
        .from("ticket_messages")
        .insert(messagePayload as any)
        .select("id")
        .single();

      if (error) throw error;

      // Check if author is the responsible and ticket is not already in_progress
      // If so, auto-update status to in_progress and insert system message
      let statusChanged = false;
      if (ticketContext && ticketContext.status !== "in_progress" && ticketContext.status !== "done" && ticketContext.status !== "discarded") {
        const isResponsible = ticketContext.type === "internal"
          ? author.profileId === ticketContext.owner_user_id
          : author.contactId === ticketContext.assigned_contact_id;

        if (isResponsible) {
          // Update ticket status to in_progress
          const { error: statusError } = await buScopedSupabase
            .from("tickets")
            .update({ 
              status: "in_progress" as TicketStatus, 
              updated_at: new Date().toISOString() 
            })
            .eq("id", ticketId);

          if (!statusError) {
            statusChanged = true;
            
            // Insert system message recording the status change
            const formattedDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            const oldStatusLabel = STATUS_LABELS[ticketContext.status];
            const newStatusLabel = STATUS_LABELS["in_progress"];
            const systemMessage = `🔄 Status alterado de **${oldStatusLabel}** para **${newStatusLabel}** (resposta do responsável). ${formattedDate}`;

            await buScopedSupabase
              .from("ticket_messages")
              .insert({
                bu_id: buId,
                ticket_id: ticketId,
                author_type: "system" as any,
                author_user_id: isExternalUser ? null : author.profileId,
                author_contact_id: isExternalUser ? author.contactId : null,
                body_richtext: {
                  type: "system",
                  content: systemMessage,
                },
              } as any);
          }
        }
      }

      // Update ticket updated_at (if not already updated by status change)
      if (!statusChanged) {
        await buScopedSupabase
          .from("tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }

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
          supabaseClient: buScopedSupabase,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.listPrefix(null),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.myTicketsPrefix(null),
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
  /** BU-scoped client (also used for storage to ensure JWT is attached) */
  supabaseClient: ReturnType<typeof useBuScopedSupabase>;
}

async function uploadAttachments({
  buId,
  ticketId,
  messageId,
  files,
  uploadedByUserId,
  supabaseClient,
}: UploadAttachmentsParams) {
  const errors: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${buId}/${ticketId}/${messageId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    // Upload to storage using the BU-scoped client to ensure JWT is attached
    // This fixes NO_BU_CONTEXT errors during cold starts / tab restores
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("ticket-attachments")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload file:", file.name, uploadError);
      errors.push(`Upload failed for ${file.name}: ${uploadError.message}`);
      continue;
    }

    // Store the storage path (not public URL since bucket is private)
    // Files will be accessed via signed URLs when displayed
    const storagePath = uploadData.path;

    // Insert attachment record with storage path
    const { error: insertError } = await supabaseClient.from("ticket_attachments").insert({
      bu_id: buId,
      ticket_id: ticketId,
      message_id: messageId,
      file_url: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by_user_id: uploadedByUserId,
    });

    if (insertError) {
      console.error("Failed to insert attachment record:", file.name, insertError);
      errors.push(`Insert failed for ${file.name}: ${insertError.message}`);
      // Attempt to clean up uploaded file
      await supabaseClient.storage.from("ticket-attachments").remove([storagePath]);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Attachment errors: ${errors.join('; ')}`);
  }
}
