import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Building2, Users } from "lucide-react";

// Type from tickets module
export type TicketType = 'internal' | 'external';

export const TICKET_TYPE_OPTIONS: Array<{
  value: TicketType;
  label: string;
  icon: typeof Building2;
}> = [
  { value: 'internal', label: 'Interno', icon: Users },
  { value: 'external', label: 'Externo', icon: Building2 },
];

interface TicketTypeSelectProps {
  value: TicketType | "all";
  onValueChange: (value: TicketType | "all") => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  showIcon?: boolean;
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
  showIcon = true,
  disabled = false,
  className,
  triggerClassName,
}: TicketTypeSelectProps) {
  const selectedOption = TICKET_TYPE_OPTIONS.find(opt => opt.value === value);
  const Icon = selectedOption?.icon;

  return (
    <Select 
      value={value} 
      onValueChange={(v) => onValueChange(v as TicketType | "all")} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[140px]", triggerClassName, className)}>
        <span className="flex items-center gap-2">
          {showIcon && Icon && (
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
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
        {TICKET_TYPE_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {showIcon && (
                  <OptionIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
