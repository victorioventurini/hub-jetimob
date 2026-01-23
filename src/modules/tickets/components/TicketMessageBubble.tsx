// ============================================================
// TICKET MESSAGE BUBBLE - Hub da Jet
// ============================================================
// Renders a ticket message with reply support.
// Wraps the generic MessageBubble with ticket-specific logic.
// ============================================================

import { useMemo } from "react";
import { MessageBubble, type GenericMessage, type MessageAttachment, DEFAULT_EXTERNAL_CONFIG } from "@/components/messaging";
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
}

/**
 * Extract text content from body_richtext.
 */
function getMessageText(bodyRichtext: RichTextContent): string {
  if (typeof bodyRichtext === "string") {
    return bodyRichtext;
  }
  if (bodyRichtext && typeof bodyRichtext === "object") {
    const content = (bodyRichtext as any).content;
    if (typeof content === "string") {
      return content;
    }
  }
  return "";
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
}: TicketMessageBubbleProps) {
  // Convert TicketMessage to GenericMessage
  const genericMessage: GenericMessage = useMemo(() => {
    const authorProfile = message.author_user ?? message.author_contact;
    const authorName = getAuthorName(message);
    const isExternalAuthor = message.author_type === "partner_contact";

    // Build reply_to data if exists and has valid content
    let replyTo = null;
    if (message.reply_to) {
      const replyContent = getMessageText(message.reply_to.body_richtext);
      // Only show reply citation if there's actual content
      if (replyContent && replyContent.trim().length > 0) {
        const replyAuthorName = 
          message.reply_to.author_user?.display_name ?? 
          message.reply_to.author_contact?.name ?? 
          "Alguém";
        replyTo = {
          id: message.reply_to.id,
          content: replyContent,
          authorName: replyAuthorName,
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
  }, [message, attachments]);

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
