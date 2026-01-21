/**
 * Ticket Messages Hooks - Barrel File
 * 
 * This file re-exports all message-related hooks for backward compatibility.
 * The actual implementations are split into:
 * - useTicketMessageQueries.ts (queries)
 * - useTicketMessageMutations.ts (mutations)
 * 
 * See docs/engineering/DEVELOPMENT_STANDARDS.md for hook organization guidelines.
 */

// Queries
export { 
  useTicketMessages, 
  useTicketAttachments 
} from './useTicketMessageQueries';

// Mutations
export { 
  useCreateMessage, 
  useEditMessage, 
  useDeleteMessage,
  type CreateMessageAuthor,
} from './useTicketMessageMutations';
