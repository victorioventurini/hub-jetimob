import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileIcon, Download, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseMentionsForDisplay } from "@/lib/mentions";
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
  // Get author from message - use author_user for internal users
  const authorProfile = message.author_user ?? (message as any).author;

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

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/");
  };

  return (
    <div className={cn(
      "flex gap-3",
      isOwnMessage && "flex-row-reverse"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={authorProfile?.photo_url ?? undefined} />
        <AvatarFallback className="text-xs">
          {authorProfile?.display_name?.slice(0, 2).toUpperCase() || "?"}
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
            {authorProfile?.display_name || "Usuário"}
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
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  isOwnMessage 
                    ? "bg-primary/10 border-primary/20 hover:bg-primary/20"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {isImage(attachment.mime_type) ? (
                  <div className="relative">
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                      <Download className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  <>
                    <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {attachment.file_name}
                      </span>
                      {attachment.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </span>
                      )}
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
