/**
 * StagnantBadge - Visual indicator for tickets without interaction for 8+ days
 * 
 * This is a purely visual component - does NOT modify any database state.
 * Renders a warning badge with tooltip when a ticket is considered stagnant.
 * 
 * @see Memory: features/tickets/stagnant-status-visual
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TICKET_STAGNANT_STYLE } from "@/lib/colors";
import { isTicketStagnant, getDaysSinceLastInteraction } from "../lib/ticketStagnation";
import type { Ticket } from "../types";

type StagnantTicketData = Pick<Ticket, "status" | "last_message_at" | "updated_at">;

interface StagnantBadgeProps {
  ticket: StagnantTicketData;
  className?: string;
}

/**
 * Displays a "Estagnado" badge when a ticket has no interactions for 8+ days.
 * Returns null if the ticket is not stagnant.
 */
export function StagnantBadge({ ticket, className }: StagnantBadgeProps) {
  if (!isTicketStagnant(ticket)) return null;
  
  const days = getDaysSinceLastInteraction(ticket);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("gap-1 text-xs", TICKET_STAGNANT_STYLE.badge, className)}>
          <PauseCircle className="h-3 w-3" />
          Estagnado
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Este ticket está sem interações há {days} dias.</p>
      </TooltipContent>
    </Tooltip>
  );
}
