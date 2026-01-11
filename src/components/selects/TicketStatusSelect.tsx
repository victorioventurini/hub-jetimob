import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Status types from tickets module
export type TicketStatus = 'waiting' | 'paused' | 'in_progress' | 'done' | 'discarded';

export const TICKET_STATUS_OPTIONS: Array<{
  value: TicketStatus;
  label: string;
  color: string;
}> = [
  { value: 'waiting', label: 'Aguardando', color: 'bg-yellow-500' },
  { value: 'paused', label: 'Pausado', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'Em Andamento', color: 'bg-blue-500' },
  { value: 'done', label: 'Concluído', color: 'bg-emerald-500' },
  { value: 'discarded', label: 'Descartado', color: 'bg-red-500' },
];

interface TicketStatusSelectProps {
  value: TicketStatus | "all";
  onValueChange: (value: TicketStatus | "all") => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  showIndicator?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Centralized ticket status select component.
 * Use for filtering and editing ticket status.
 * 
 * @example
 * // Filter usage
 * <TicketStatusSelect value={filter} onValueChange={setFilter} includeAll />
 * 
 * // Form usage (no "all" option)
 * <TicketStatusSelect value={status} onValueChange={setStatus} />
 */
export function TicketStatusSelect({
  value,
  onValueChange,
  placeholder = "Status",
  includeAll = false,
  allLabel = "Todos os status",
  showIndicator = true,
  disabled = false,
  className,
  triggerClassName,
}: TicketStatusSelectProps) {
  const selectedOption = TICKET_STATUS_OPTIONS.find(opt => opt.value === value);

  return (
    <Select 
      value={value} 
      onValueChange={(v) => onValueChange(v as TicketStatus | "all")} 
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
        {TICKET_STATUS_OPTIONS.map((option) => (
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
