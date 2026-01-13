import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_STYLES, type TicketStatusKey } from "@/lib/colors";

// Status types from tickets module
export type TicketStatus = 'waiting' | 'paused' | 'in_progress' | 'done' | 'discarded';

export const TICKET_STATUS_OPTIONS: Array<{
  value: TicketStatus;
  label: string;
  dotColor: string;
}> = [
  { value: 'waiting', label: 'Aguardando', dotColor: TICKET_STATUS_STYLES.waiting.dot },
  { value: 'paused', label: 'Pausado', dotColor: TICKET_STATUS_STYLES.paused.dot },
  { value: 'in_progress', label: 'Em Andamento', dotColor: TICKET_STATUS_STYLES.in_progress.dot },
  { value: 'done', label: 'Concluído', dotColor: TICKET_STATUS_STYLES.done.dot },
  { value: 'discarded', label: 'Descartado', dotColor: TICKET_STATUS_STYLES.discarded.dot },
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
            <span className={cn("h-2 w-2 rounded-full shrink-0", selectedOption.dotColor)} />
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
                <span className={cn("h-2 w-2 rounded-full shrink-0", option.dotColor)} />
              )}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
