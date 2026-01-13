import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Type from tickets module
export type TicketType = 'internal' | 'external';

export const TICKET_TYPE_OPTIONS: Array<{
  value: TicketType;
  label: string;
}> = [
  { value: 'internal', label: 'Interno' },
  { value: 'external', label: 'Externo' },
];

interface TicketTypeSelectProps {
  value: TicketType | "all";
  onValueChange: (value: TicketType | "all") => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Centralized ticket type select component.
 * Use for filtering tickets by type (internal/external).
 * 
 * @example
 * // Filter usage
 * <TicketTypeSelect value={filter} onValueChange={setFilter} includeAll />
 * 
 * // Form usage
 * <TicketTypeSelect value={type} onValueChange={setType} />
 */
export function TicketTypeSelect({
  value,
  onValueChange,
  placeholder = "Tipo",
  includeAll = false,
  allLabel = "Todos os tipos",
  disabled = false,
  className,
  triggerClassName,
}: TicketTypeSelectProps) {
  return (
    <Select 
      value={value} 
      onValueChange={(v) => onValueChange(v as TicketType | "all")} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[140px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {TICKET_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
