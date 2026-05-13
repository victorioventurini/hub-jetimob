/**
 * LockedTextarea — bloqueia copy/paste/contextmenu/drag e sinaliza tentativas via callback.
 */
import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LockedTextareaProps extends React.ComponentProps<"textarea"> {
  onPasteAttempt?: () => void;
  onCopyAttempt?: () => void;
  onLargeJump?: (lengthDelta: number) => void;
}

export const LockedTextarea = React.forwardRef<HTMLTextAreaElement, LockedTextareaProps>(
  ({ onPasteAttempt, onCopyAttempt, onLargeJump, onChange, className, ...props }, ref) => {
    const lastLenRef = React.useRef(0);
    return (
      <Textarea
        ref={ref}
        autoComplete="off"
        spellCheck={false}
        className={cn("font-mono text-sm", className)}
        onPaste={(e) => {
          e.preventDefault();
          onPasteAttempt?.();
        }}
        onCopy={(e) => {
          e.preventDefault();
          onCopyAttempt?.();
        }}
        onCut={(e) => {
          e.preventDefault();
          onCopyAttempt?.();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onPasteAttempt?.();
        }}
        onContextMenu={(e) => e.preventDefault()}
        onChange={(e) => {
          const newLen = e.target.value.length;
          const delta = newLen - lastLenRef.current;
          if (delta > 50) onLargeJump?.(delta);
          lastLenRef.current = newLen;
          onChange?.(e);
        }}
        {...props}
      />
    );
  }
);
LockedTextarea.displayName = "LockedTextarea";
