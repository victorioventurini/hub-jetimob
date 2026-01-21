import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseMentionsForDisplay } from "@/lib/mentions";
import { AttachmentLink } from "./AttachmentLink";
import type { TicketMessage, TicketAttachment } from "../types";

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
}

export function TicketMessageBubble({
  message,
  isOwnMessage,
  attachments = [],
  canPin = false,
  onTogglePin,
  isPinning = false,
}: TicketMessageBubbleProps) {
  // Get author info - handle both internal users and external contacts
  const authorProfile = message.author_user ?? message.author_contact;
  const authorName = message.author_user?.display_name ?? message.author_contact?.name ?? "Usuário";
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  const isExternalAuthor = message.author_type === "partner_contact";

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

  const handleTogglePin = () => {
    if (onTogglePin) {
      onTogglePin(message.id, !message.is_pinned);
    }
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      isOwnMessage && "flex-row-reverse"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={(authorProfile as any)?.photo_url ?? undefined} />
        <AvatarFallback className={cn("text-xs", isExternalAuthor && "bg-muted")}>
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
          {isExternalAuthor && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              Externo
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-muted-foreground italic">(editado)</span>
          )}
          {message.is_pinned && (
            <Pin className="h-3 w-3 text-warning" />
          )}
          
          {/* Pin button - visible on hover */}
          {canPin && onTogglePin && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity",
                message.is_pinned && "opacity-100"
              )}
              onClick={handleTogglePin}
              disabled={isPinning}
              title={message.is_pinned ? "Desafixar mensagem" : "Fixar mensagem"}
            >
              {message.is_pinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </Button>
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
