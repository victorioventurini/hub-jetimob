// ============================================================
// GENERIC MESSAGING - QUOTED MESSAGE COMPONENT
// ============================================================
// Renders the citation of an original message inside a reply bubble.
// Style: WhatsApp-like with colored left border.
// ============================================================

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
 * 
 * @example
 * ```tsx
 * <QuotedMessage
 *   replyTo={{ id: "123", content: "Original text", authorName: "João" }}
 *   onScrollToMessage={(id) => scrollToElement(id)}
 * />
 * ```
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
      <p className="text-xs text-muted-foreground line-clamp-2">
        {truncateContent(replyTo.content)}
      </p>
    </button>
  );
}
