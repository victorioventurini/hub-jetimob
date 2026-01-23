/**
 * Tickets Module Hooks Barrel
 * 
 * Consolidated exports from all ticket-related hooks.
 * All imports should come from this file, NOT from individual hook files.
 * 
 * @see docs/canonical/DEVELOPMENT_STANDARDS.md (Section K: Hooks e Barrel Files)
 */

// Core ticket queries
export { 
  useTickets, 
  useTicket, 
  useMyTickets 
} from './useTicketQueries';

// Core ticket mutations
export { 
  useCreateTicket, 
  useUpdateTicket, 
  useUpdateTicketStatus, 
  useDeleteTicket,
  type StatusChangeContext,
} from './useTicketMutations';

// Query utilities
export { 
  fetchMessagesCounts, 
  fetchMentions, 
  normalizeTicketRelations,
  type MentionRow,
  type MentionInfo,
} from './ticketQueryUtils';

// Messages queries
export { 
  useTicketMessages, 
  useTicketAttachments,
} from './useTicketMessageQueries';

// Messages mutations
export { 
  useCreateMessage, 
  useEditMessage, 
  useDeleteMessage,
  type CreateMessageAuthor,
  type TicketContext,
} from './useTicketMessageMutations';

// Attachments
export {
  useAttachmentUrl,
  getSignedAttachmentUrl,
  isStoragePath,
} from './useAttachmentUrl';

// Partners
export { 
  usePartnerCompanies, 
  usePartnerCompany, 
  useCreatePartnerCompany, 
  useUpdatePartnerCompany, 
  useDeletePartnerCompany, 
  usePartnerContacts, 
  usePartnerContact, 
  useCreatePartnerContact, 
  useUpdatePartnerContact, 
  useDeletePartnerContact 
} from './usePartners';

// Partner Contacts Global (new multi-BU model)
export {
  useCheckContactByEmail,
  useContactBuAssociations,
  useActivateContactInBu,
  useCreateGlobalContact,
  useDeactivateContactInBu,
  type PartnerContactWithAssociations,
  type ContactBuAssociation,
} from './usePartnerContactGlobal';

// Partner Services
export { 
  usePartnerServices, 
  usePartnerCategories, 
  usePartnerSubcategories, 
  usePartnerServiceMappings, 
  useCreatePartnerService, 
  useDeletePartnerService, 
  useSavePartnerServices, 
  useHasPartnerServices 
} from './usePartnerServices';

// Categories
export { 
  useTicketCategories, 
  useCreateTicketCategory, 
  useUpdateTicketCategory, 
  useDeleteTicketCategory, 
  useCreateTicketSubcategory, 
  useUpdateTicketSubcategory, 
  useDeleteTicketSubcategory 
} from './useTicketCategories';

// Routing
export { 
  useRoutingRules, 
  useCreateRoutingRule, 
  useUpdateRoutingRule, 
  useDeleteRoutingRule 
} from './useRoutingRules';

// Internal routing
export { 
  useInternalRoutingRules,
  useCreateInternalRoutingRule,
  useUpdateInternalRoutingRule,
  useDeleteInternalRoutingRule,
} from './useInternalRoutingRules';

// Contact capabilities
export { 
  useContactCapabilities, 
  useCreateContactCapability, 
  useSaveContactCapabilities, 
  useCompanyContactCapabilities,
  useDeleteContactCapability,
  type ContactCapability,
} from './useContactCapabilities';

// Available external contacts (for ticket creation)
export {
  useAvailableExternalContacts,
  useContactsByCapability,
  useCompanyFallbackContacts,
  useUpdateFallbackContacts,
  type AvailableExternalContact,
} from './useAvailableExternalContacts';

// Partner company contacts (canonical list by company)
export {
  usePartnerCompanyContacts,
  type PartnerContactListItem,
} from './usePartnerCompanyContacts';

// Summary
export { useTicketsSummary } from './useTicketsSummary';

// Contact ticket migration
export {
  usePendingTicketsForContact,
  useMigrateAndRemoveContact,
} from './useContactTicketMigration';

// Transfer
export {
  useTransferTicket,
  type TransferTicketParams,
} from './useTransferTicket';

// Pin messages
export {
  usePinMessage,
  canUserPinMessages,
  type PinMessageParams,
} from './usePinMessage';

// Viewers and mentions (for ticket detail page)
export { useTicketViewersAndMentions } from './useTicketViewersAndMentions';
