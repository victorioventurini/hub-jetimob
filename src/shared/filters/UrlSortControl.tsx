import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortOption {
  value: string;
  label: string;
}

interface UrlSortControlProps {
  sort: string;
  dir: "asc" | "desc";
  onSortChange: (sort: string) => void;
  onDirChange: (dir: "asc" | "desc") => void;
  options: SortOption[];
  className?: string;
  disabled?: boolean;
}

/**
 * Controle de ordenação integrado com URL state
 * - Seleção de campo de ordenação
 * - Toggle de direção (asc/desc)
 */
export function UrlSortControl({
  sort,
  dir,
  onSortChange,
  onDirChange,
  options,
  className,
  disabled = false,
}: UrlSortControlProps) {
  const currentLabel = options.find((o) => o.value === sort)?.label || "Ordenar";
  const DirIcon = dir === "asc" ? ArrowUpAZ : ArrowDownAZ;

  const toggleDirection = () => {
    onDirChange(dir === "asc" ? "desc" : "asc");
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {currentLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuRadioGroup value={sort} onValueChange={onSortChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={dir}
            onValueChange={(v) => onDirChange(v as "asc" | "desc")}
          >
            <DropdownMenuRadioItem value="asc">
              <ArrowUpAZ className="h-4 w-4 mr-2" />
              Crescente
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">
              <ArrowDownAZ className="h-4 w-4 mr-2" />
              Decrescente
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Toggle button for quick direction change */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDirection}
        disabled={disabled || !sort}
        className="h-9 w-9"
        title={dir === "asc" ? "Ordenação crescente" : "Ordenação decrescente"}
      >
        <DirIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
