// ============================================================
// GENERIC MESSAGING - QUOTED MESSAGE COMPONENT
// ============================================================
// Renders the citation of an original message inside a reply bubble.
// Style: WhatsApp-like with colored left border.
//
// Contract: renders when EITHER content is present OR attachments exist.
// Messages composed only of attachments still render as a meaningful
// citation (filename + paperclip icon).
// ============================================================

import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuotedMessageProps } from "./types";

/**
 * Truncates content for display in quote.
 */
function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}

/**
 * QuotedMessage - inline citation of replied message.
 */
export function QuotedMessage({
  replyTo,
  onScrollToMessage,
  className,
}: QuotedMessageProps) {
  const handleClick = () => {
    if (onScrollToMessage) {
      onScrollToMessage(replyTo.id);
    }
  };

  const trimmedContent = (replyTo.content ?? "").trim();
  const hasContent = trimmedContent.length > 0;
  const attachments = replyTo.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  // Don't render if there is nothing to show
  if (!hasContent && !hasAttachments) {
    return null;
  }

  // Attachment preview text: filename if single, otherwise count
  const attachmentLabel = hasAttachments
    ? attachments.length === 1
      ? attachments[0].fileName
      : `${attachments.length} anexos`
    : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onScrollToMessage}
      className={cn(
        "w-full text-left rounded-md bg-muted/50 border-l-4 border-primary/60 px-3 py-2 mb-2",
        "transition-colors hover:bg-muted/80",
        !onScrollToMessage && "cursor-default",
        className
      )}
    >
      <p className="text-xs font-medium text-primary mb-0.5">
        {replyTo.authorName}
      </p>

      {hasContent && (
        <p className="text-xs text-muted-foreground line-clamp-2 break-words [overflow-wrap:anywhere]">
          {truncateContent(trimmedContent)}
        </p>
      )}

      {hasAttachments && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground",
            hasContent && "mt-1"
          )}
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{attachmentLabel}</span>
        </p>
      )}
    </button>
  );
}
