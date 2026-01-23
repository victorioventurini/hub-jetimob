// ============================================================
// GENERIC MESSAGING - MESSAGE BUBBLE COMPONENT
// ============================================================
// Renders a single message with author info, content, and actions.
// Supports: reply quotes, attachments, pinning, and reply action.
// ============================================================

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Reply, Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QuotedMessage } from "./QuotedMessage";
import { DEFAULT_INTERNAL_CONFIG, type MessageBubbleProps } from "./types";

/**
 * Get initials from name for avatar fallback.
 */
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * MessageBubble - generic message display component.
 * 
 * @example
 * ```tsx
 * <MessageBubble
 *   message={message}
 *   isOwnMessage={true}
 *   config={config}
 *   onReply={(msg) => setReplyingTo(msg)}
 *   onTogglePin={(id, pin) => handlePin(id, pin)}
 * />
 * ```
 */
export function MessageBubble({
  message,
  isOwnMessage,
  config = DEFAULT_INTERNAL_CONFIG,
  onReply,
  onTogglePin,
  isPinning = false,
  onScrollToMessage,
  renderContent,
  renderAttachments,
}: MessageBubbleProps) {
  const author = message.author;
  const isExternal = author.type === "external";

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleTogglePin = () => {
    if (onTogglePin) {
      onTogglePin(message.id, !message.isPinned);
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-3 group",
        isOwnMessage && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={author.photoUrl ?? undefined} />
        <AvatarFallback 
          className={cn("text-xs", isExternal && "bg-accent text-accent-foreground")}
        >
          {getInitials(author.name)}
        </AvatarFallback>
      </Avatar>

      {/* Content area */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isOwnMessage && "text-right"
      )}>
        {/* Header: author name, badges, timestamp, actions */}
        <div className={cn(
          "flex items-center gap-2 mb-1 flex-wrap",
          isOwnMessage && "justify-end"
        )}>
          <span className="text-sm font-medium">{author.name}</span>
          
          {isExternal && config.allowExternalParticipants && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              Externo
            </Badge>
          )}
          
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
          
          {message.editedAt && (
            <span className="text-xs text-muted-foreground italic">(editado)</span>
          )}
          
          {message.isPinned && (
            <Pin className="h-3 w-3 text-warning" />
          )}

          {/* Actions - visible on hover */}
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            (message.isPinned) && "opacity-100"
          )}>
            {/* Reply button */}
            {config.allowReply && onReply && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleReply}
                title="Responder"
              >
                <Reply className="h-3 w-3" />
              </Button>
            )}
            
            {/* Pin button */}
            {config.allowPinning && onTogglePin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleTogglePin}
                disabled={isPinning}
                title={message.isPinned ? "Desafixar mensagem" : "Fixar mensagem"}
              >
                {message.isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Quoted message if this is a reply */}
        {message.replyTo && (
          <QuotedMessage
            replyTo={message.replyTo}
            onScrollToMessage={onScrollToMessage}
          />
        )}

        {/* Message content */}
        {message.content && (
          <div className={cn(
            "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap inline-block",
            "bg-muted text-foreground",
            isOwnMessage ? "text-right" : "text-left"
          )}>
            {renderContent ? renderContent(message.content) : message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && renderAttachments && (
          <div className={cn(
            "mt-2 flex flex-wrap gap-2",
            isOwnMessage && "justify-end"
          )}>
            {renderAttachments(message.attachments)}
          </div>
        )}
      </div>
    </div>
  );
}
