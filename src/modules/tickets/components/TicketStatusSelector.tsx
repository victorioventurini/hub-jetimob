/**
 * TicketStatusSelector - Seletor de status para tickets em dropdown
 * 
 * Exibe um dropdown compacto com opções de status coloridas.
 */

import { cn } from "@/lib/utils";
import { TICKET_STATUS_STYLES } from "@/lib/colors";
import { Loader2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  const currentStatus = STATUS_OPTIONS.find((opt) => opt.value === value);
  const currentStyles = TICKET_STATUS_STYLES[value];

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">Status</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className={cn(
              "w-full justify-between font-medium",
              currentStyles.badge
            )}
          >
            <span className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", currentStyles.dot)} />
              {currentStatus?.label}
            </span>
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px] bg-background">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            const styles = TICKET_STATUS_STYLES[option.value];

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onChange(option.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", styles.dot)} />
                <span className="flex-1">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
