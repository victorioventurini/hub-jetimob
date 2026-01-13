import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Status types from assets module
export type AssetInventoryStatus = 'available' | 'loaned' | 'maintenance' | 'written_off';

export const ASSET_STATUS_OPTIONS: Array<{
  value: AssetInventoryStatus;
  label: string;
  color: string;
}> = [
  { value: 'available', label: 'Disponível', color: 'bg-status-green' },
  { value: 'loaned', label: 'Emprestado', color: 'bg-info' },
  { value: 'maintenance', label: 'Em Manutenção', color: 'bg-status-yellow' },
  { value: 'written_off', label: 'Baixado', color: 'bg-status-gray' },
];

interface AssetStatusSelectProps {
  value: AssetInventoryStatus | "all";
  onValueChange: (value: AssetInventoryStatus | "all") => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  showIndicator?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Centralized asset status select component.
 * Use for filtering and editing asset inventory status.
 * 
 * @example
 * // Filter usage
 * <AssetStatusSelect value={filter} onValueChange={setFilter} includeAll />
 * 
 * // Form usage (no "all" option)
 * <AssetStatusSelect value={status} onValueChange={setStatus} />
 */
export function AssetStatusSelect({
  value,
  onValueChange,
  placeholder = "Status",
  includeAll = false,
  allLabel = "Todos os status",
  showIndicator = true,
  disabled = false,
  className,
  triggerClassName,
}: AssetStatusSelectProps) {
  const selectedOption = ASSET_STATUS_OPTIONS.find(opt => opt.value === value);

  return (
    <Select 
      value={value} 
      onValueChange={(v) => onValueChange(v as AssetInventoryStatus | "all")} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[160px]", triggerClassName, className)}>
        <span className="flex items-center gap-2">
          {showIndicator && selectedOption && (
            <span className={cn("h-2 w-2 rounded-full shrink-0", selectedOption.color)} />
          )}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {ASSET_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              {showIndicator && (
                <span className={cn("h-2 w-2 rounded-full shrink-0", option.color)} />
              )}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
