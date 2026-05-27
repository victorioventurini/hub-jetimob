// ============================================================
// TICKET MESSAGE BUBBLE - Next da Jet
// ============================================================
// Renders a ticket message with reply support.
// Wraps the generic MessageBubble with ticket-specific logic.
// ============================================================

import { useMemo } from "react";
import { MessageBubble, type GenericMessage, type MessageAttachment, DEFAULT_EXTERNAL_CONFIG } from "@/components/messaging";
import { richtextToPlain } from "@/components/messaging/richtextToPlain";
import { parseMentionsForDisplay } from "@/lib/mentions";
import { AttachmentLink } from "./AttachmentLink";
import type { TicketMessage, TicketAttachment, RichTextContent } from "../types";

interface TicketMessageBubbleProps {
  message: TicketMessage;
  isOwnMessage: boolean;
  attachments?: TicketAttachment[];
  /** Se o usuário pode fixar mensagens neste ticket */
  canPin?: boolean;
  /** Callback para fixar/desafixar mensagem */
  onTogglePin?: (messageId: string, pin: boolean) => void;
  /** Se está processando pin */
  isPinning?: boolean;
  /** Callback para responder à mensagem */
  onReply?: (message: TicketMessage) => void;
  /** Callback para scroll até uma mensagem específica */
  onScrollToMessage?: (messageId: string) => void;
  /** Lookup map: id da mensagem original → mensagem completa (fallback quando o JOIN reply_to vier vazio) */
  messagesById?: Map<string, TicketMessage>;
  /** Lookup map: id da mensagem → anexos não-deletados dessa mensagem */
  attachmentsByMessage?: Map<string, TicketAttachment[]>;
}

/**
 * Extract text content from body_richtext (delegates to canonical helper).
 */
function getMessageText(bodyRichtext: RichTextContent): string {
  return richtextToPlain(bodyRichtext);
}

/**
 * Get author name from ticket message.
 */
function getAuthorName(message: TicketMessage): string {
  return message.author_user?.display_name ?? message.author_contact?.name ?? "Alguém";
}

export function TicketMessageBubble({
  message,
  isOwnMessage,
  attachments = [],
  canPin = false,
  onTogglePin,
  isPinning = false,
  onReply,
  onScrollToMessage,
  messagesById,
  attachmentsByMessage,
}: TicketMessageBubbleProps) {
  // Convert TicketMessage to GenericMessage
  const genericMessage: GenericMessage = useMemo(() => {
    const authorProfile = message.author_user ?? message.author_contact;
    const authorName = getAuthorName(message);
    const isExternalAuthor = message.author_type === "partner_contact";

    // Build reply_to data: prefer the JOIN payload, but fall back to the
    // already-loaded messages list (covers retroactive/older replies whose
    // embed didn't materialize) and to the global attachments map.
    let replyTo = null;
    const replyId = message.reply_to_message_id ?? message.reply_to?.id ?? null;
    if (replyId) {
      const joined = message.reply_to ?? null;
      const fallback = messagesById?.get(replyId) ?? null;

      const sourceBody = joined?.body_richtext ?? fallback?.body_richtext;
      const replyContent = sourceBody ? getMessageText(sourceBody as RichTextContent) : "";

      const joinedAttachments = (joined?.attachments ?? []).filter((a) => !a.deleted_at);
      const mappedAttachments = attachmentsByMessage?.get(replyId) ?? [];
      // Prefer JOIN attachments if present, otherwise the global map (always non-deleted there).
      const sourceAttachments = joinedAttachments.length > 0
        ? joinedAttachments.map((a) => ({ id: a.id, fileName: a.file_name, mimeType: a.mime_type }))
        : mappedAttachments.map((a) => ({ id: a.id, fileName: a.file_name, mimeType: a.mime_type }));

      const hasContent = replyContent.trim().length > 0;
      const hasAttachments = sourceAttachments.length > 0;

      if (hasContent || hasAttachments) {
        const replyAuthorName =
          joined?.author_user?.display_name ??
          joined?.author_contact?.name ??
          fallback?.author_user?.display_name ??
          fallback?.author_contact?.name ??
          "Alguém";
        replyTo = {
          id: replyId,
          content: replyContent,
          authorName: replyAuthorName,
          attachments: sourceAttachments,
        };
      }
    }

    // Convert attachments to generic format
    const genericAttachments: MessageAttachment[] = attachments.map(att => ({
      id: att.id,
      fileName: att.file_name,
      fileSize: att.file_size,
      mimeType: att.mime_type,
      storagePath: att.file_url,
    }));

    return {
      id: message.id,
      content: getMessageText(message.body_richtext),
      createdAt: message.created_at,
      editedAt: message.edited_at,
      author: {
        id: message.author_user_id ?? message.author_contact_id ?? "",
        name: authorName,
        photoUrl: (authorProfile as any)?.photo_url ?? null,
        type: isExternalAuthor ? "external" : "internal",
      },
      isPinned: message.is_pinned,
      attachments: genericAttachments,
      replyTo,
    };
  }, [message, attachments, messagesById, attachmentsByMessage]);

  // Handle reply - convert back to TicketMessage
  const handleReply = (msg: GenericMessage) => {
    if (onReply) {
      onReply(message);
    }
  };

  // Custom content renderer with mentions
  const renderContent = (content: string) => {
    return parseMentionsForDisplay(content);
  };

  // Custom attachment renderer
  const renderAttachments = (atts: MessageAttachment[]) => {
    return attachments.map((attachment) => (
      <AttachmentLink
        key={attachment.id}
        attachment={attachment}
        isOwnMessage={isOwnMessage}
      />
    ));
  };

  return (
    <MessageBubble
      message={genericMessage}
      isOwnMessage={isOwnMessage}
      config={{
        ...DEFAULT_EXTERNAL_CONFIG,
        allowPinning: canPin,
        allowReply: true,
      }}
      onReply={onReply ? handleReply : undefined}
      onTogglePin={onTogglePin}
      isPinning={isPinning}
      onScrollToMessage={onScrollToMessage}
      renderContent={renderContent}
      renderAttachments={attachments.length > 0 ? renderAttachments : undefined}
    />
  );
}
