import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { parseMentionsForDisplay } from "@/lib/mentions";
import { AttachmentLink } from "./AttachmentLink";
import type { TicketMessage, TicketAttachment } from "../types";

interface TicketMessageBubbleProps {
  message: TicketMessage;
  isOwnMessage: boolean;
  attachments?: TicketAttachment[];
}

export function TicketMessageBubble({
  message,
  isOwnMessage,
  attachments = [],
}: TicketMessageBubbleProps) {
  // Get author info - handle both internal users and external contacts
  const authorProfile = message.author_user ?? message.author_contact;
  const authorName = message.author_user?.display_name ?? message.author_contact?.name ?? "Usuário";
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  // Extract text content from body_richtext
  const getMessageText = (): string => {
    if (typeof message.body_richtext === "string") {
      return message.body_richtext;
    }
    if (message.body_richtext && typeof message.body_richtext === "object") {
      const content = (message.body_richtext as any).content;
      if (typeof content === "string") {
        return content;
      }
    }
    return "";
  };

  const messageText = getMessageText();
  const messageContent = parseMentionsForDisplay(messageText);

  return (
    <div className={cn(
      "flex gap-3",
      isOwnMessage && "flex-row-reverse"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={(authorProfile as any)?.photo_url ?? undefined} />
        <AvatarFallback className="text-xs">
          {authorInitials}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "flex-1 max-w-[80%]",
        isOwnMessage && "text-right"
      )}>
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isOwnMessage && "justify-end"
        )}>
          <span className="text-sm font-medium">
            {authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-muted-foreground italic">(editado)</span>
          )}
        </div>

        {/* Message content */}
        {messageText && (
          <div className={cn(
            "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap inline-block",
            "bg-muted text-foreground",
            isOwnMessage ? "text-right" : "text-left"
          )}>
            {messageContent}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={cn(
            "mt-2 flex flex-wrap gap-2",
            isOwnMessage && "justify-end"
          )}>
            {attachments.map((attachment) => (
              <AttachmentLink 
                key={attachment.id} 
                attachment={attachment} 
                isOwnMessage={isOwnMessage} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
