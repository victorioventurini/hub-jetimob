import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  showClear?: boolean;
  clearLabel?: string;
  className?: string;
}

export function FilterBar({
  children,
  onClearAll,
  showClear = false,
  clearLabel = "Limpar filtros",
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        className
      )}
    >
      {children}
      {showClear && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground h-9"
        >
          <X className="w-4 h-4 mr-1" />
          {clearLabel}
        </Button>
      )}
    </div>
  );
}

// ============= FilterSection =============

interface FilterSectionProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterSection({ label, children, className }: FilterSectionProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
