/**
 * AreaSelect - Padronized dropdown to select an area
 * Follows TeamSelect pattern for consistency
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAreas } from "@/modules/areas/hooks";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AreaSelectProps {
  value: string | undefined | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  includeInactive?: boolean;
}

/**
 * Centralized area select component.
 * Shows areas with color indicators.
 */
export function AreaSelect({
  value,
  onValueChange,
  placeholder = "Selecione uma área",
  includeAll = false,
  allLabel = "Todas as áreas",
  includeNone = false,
  noneLabel = "Nenhuma",
  disabled = false,
  className,
  triggerClassName,
  includeInactive = false,
}: AreaSelectProps) {
  const { data: areas = [], isLoading } = useAreas({ includeInactive });

  const handleValueChange = (newValue: string) => {
    if (newValue === "all" || newValue === "none") {
      onValueChange(null);
    } else {
      onValueChange(newValue);
    }
  };

  // Handle null value (treat as none/all based on config)
  const normalizedValue = value === null ? undefined : value;
  const displayValue = normalizedValue ?? (includeAll ? "all" : includeNone ? "none" : "");

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-full", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {includeNone && (
          <SelectItem value="none" className="text-muted-foreground">
            {noneLabel}
          </SelectItem>
        )}
        {areas.map((area) => (
          <SelectItem key={area.id} value={area.id}>
            <div className="flex items-center gap-2">
              <Building2
                className="h-4 w-4 shrink-0"
                style={{ color: area.color || "currentColor" }}
              />
              <span>{area.name}</span>
              {area.status === "inactive" && (
                <span className="text-muted-foreground text-xs">(Inativa)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {!isLoading && areas.length === 0 && (
          <div className="py-2 px-2 text-sm text-muted-foreground text-center">
            Nenhuma área cadastrada
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
