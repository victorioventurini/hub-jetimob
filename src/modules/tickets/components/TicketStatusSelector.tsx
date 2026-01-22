/**
 * TicketStatusSelector - Seletor visual de status para tickets
 * 
 * Exibe botões de status com indicadores de cor, permitindo
 * mudança de status de forma mais intuitiva que um dropdown.
 */

import { cn } from "@/lib/utils";
import { TICKET_STATUS_STYLES } from "@/lib/colors";
import { Loader2 } from "lucide-react";
import type { TicketStatus } from "../types";

const STATUS_OPTIONS: Array<{
  value: TicketStatus;
  label: string;
}> = [
  { value: "waiting", label: "Aguardando" },
  { value: "in_progress", label: "Em andamento" },
  { value: "paused", label: "Pausado" },
  { value: "done", label: "Concluído" },
  { value: "discarded", label: "Descartado" },
];

interface TicketStatusSelectorProps {
  value: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled?: boolean;
  isUpdating?: boolean;
}

export function TicketStatusSelector({
  value,
  onChange,
  disabled = false,
  isUpdating = false,
}: TicketStatusSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Status</p>
      <div className="grid grid-cols-2 gap-1.5">
        {STATUS_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const styles = TICKET_STATUS_STYLES[option.value];
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled || isUpdating}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left",
                "border disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected 
                  ? cn(styles.badge, "border-current ring-1 ring-current/20")
                  : "bg-background border-border hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                styles.dot
              )} />
              <span className="truncate">{option.label}</span>
              {isUpdating && isSelected && (
                <Loader2 className="h-3 w-3 animate-spin ml-auto" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
