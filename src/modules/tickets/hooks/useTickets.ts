/**
 * Ticket Hooks - Barrel Export
 * 
 * Re-exports all ticket hooks from their modular files.
 * This file maintains backward compatibility for existing imports.
 */

// Field definitions
export { TICKET_FIELDS, TICKET_STALE_TIME, DEFAULT_LIMIT } from './ticketFieldDefinitions';

// Query utilities
export { fetchMessagesCounts, fetchMentions, normalizeTicketRelations } from './ticketQueryUtils';
export type { MentionRow, MentionInfo } from './ticketQueryUtils';

// Query hooks
export { useTickets, useTicket, useMyTickets } from './useTicketQueries';

// Mutation hooks
export { useCreateTicket, useUpdateTicket, useUpdateTicketStatus, useDeleteTicket } from './useTicketMutations';
