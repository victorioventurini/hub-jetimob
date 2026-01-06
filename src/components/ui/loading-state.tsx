import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============= LoadingSpinner =============

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// ============= LoadingState (Full Page/Section) =============

interface LoadingStateProps {
  text?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({ 
  text = "Carregando...", 
  className,
  fullPage = false 
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-screen" : "py-16",
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

// ============= SkeletonCard =============

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
}

export function SkeletonCard({ 
  className, 
  lines = 3, 
  showAvatar = false,
  showImage = false 
}: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {showImage && <Skeleton className="w-full h-32 rounded-md" />}
      <div className="flex items-start gap-3">
        {showAvatar && <Skeleton className="w-10 h-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn("h-3", i === lines - 2 ? "w-1/2" : "w-full")} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= SkeletonList =============

interface SkeletonListProps {
  count?: number;
  variant?: "card" | "row" | "compact";
  className?: string;
  showAvatar?: boolean;
}

export function SkeletonList({ 
  count = 3, 
  variant = "card", 
  className,
  showAvatar = false 
}: SkeletonListProps) {
  if (variant === "row") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            {showAvatar && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-1", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2">
            {showAvatar && <Skeleton className="w-6 h-6 rounded-full shrink-0" />}
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  // Default: card
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

// ============= SkeletonTable =============

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("rounded-lg border", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className={cn(
            "flex gap-4 p-4",
            rowIndex < rows - 1 && "border-b"
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "w-1/4 flex-none"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}
