/**
 * Ticket Stagnation Utilities
 * 
 * Pure frontend logic to detect stagnant tickets (no interaction for 8+ days).
 * Does NOT modify any database or backend state.
 * 
 * @see Memory: features/tickets/stagnant-status-visual
 */

import { differenceInDays } from "date-fns";
import type { Ticket } from "../types";

/** Threshold in days to consider a ticket stagnant (8 days = 7 complete days without interaction) */
export const STAGNATION_THRESHOLD_DAYS = 8;

/**
 * Checks if a ticket is stagnant (no interaction for 8+ days)
 * 
 * Rules:
 * - Tickets with status "done" or "discarded" can NEVER be stagnant
 * - Uses `last_message_at` as primary reference (real interaction)
 * - Falls back to `updated_at` if no messages exist
 * 
 * @param ticket - The ticket to check
 * @returns true if ticket is stagnant
 */
export function isTicketStagnant(ticket: Pick<Ticket, "status" | "last_message_at" | "updated_at">): boolean {
  // Finalized tickets cannot be stagnant
  if (ticket.status === "done" || ticket.status === "discarded") {
    return false;
  }
  
  const lastInteraction = ticket.last_message_at || ticket.updated_at;
  if (!lastInteraction) return false;
  
  const daysSinceInteraction = differenceInDays(new Date(), new Date(lastInteraction));
  
  return daysSinceInteraction >= STAGNATION_THRESHOLD_DAYS;
}

/**
 * Returns the number of days since the last interaction
 * 
 * @param ticket - The ticket to check
 * @returns Number of days since last interaction
 */
export function getDaysSinceLastInteraction(ticket: Pick<Ticket, "last_message_at" | "updated_at">): number {
  const lastInteraction = ticket.last_message_at || ticket.updated_at;
  if (!lastInteraction) return 0;
  
  return differenceInDays(new Date(), new Date(lastInteraction));
}
