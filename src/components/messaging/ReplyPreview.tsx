// ============================================================
// GENERIC MESSAGING - REPLY PREVIEW COMPONENT
// ============================================================
// Banner that appears above the composer when replying to a message.
// Shows: "Respondendo a [Name]" with cancel button.
// ============================================================

import { X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReplyPreviewProps } from "./types";

/**
 * Truncates content for preview display.
 */
function truncateContent(content: string, maxLength = 80): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}

/**
 * ReplyPreview - banner shown when user is replying to a message.
 * 
 * @example
 * ```tsx
 * {replyingTo && (
 *   <ReplyPreview
 *     replyingTo={replyingTo}
 *     onCancel={() => setReplyingTo(null)}
 *   />
 * )}
 * ```
 */
export function ReplyPreview({
  replyingTo,
  onCancel,
  className,
}: ReplyPreviewProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2 rounded-t-lg bg-muted border border-b-0 border-border",
        className
      )}
    >
      <Reply className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary">
          Respondendo a {replyingTo.author.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {truncateContent(replyingTo.content)}
        </p>
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
        aria-label="Cancelar resposta"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
