import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  iconClassName,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            compact ? "w-6 h-6" : "w-8 h-8",
            iconClassName
          )}
        />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          compact ? "text-base" : "text-xl"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground max-w-md",
          compact ? "text-sm mb-4" : "text-base mb-6"
        )}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size={compact ? "sm" : "default"}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
