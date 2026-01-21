// Tickets module hooks barrel export

// Core tickets
export { 
  useTickets, 
  useTicket, 
  useMyTickets, 
  useCreateTicket, 
  useUpdateTicket, 
  useUpdateTicketStatus, 
  useDeleteTicket 
} from './useTickets';

// Messages (split into queries and mutations for modularity)
export { 
  useTicketMessages, 
  useTicketAttachments,
} from './useTicketMessageQueries';

export { 
  useCreateMessage, 
  useEditMessage, 
  useDeleteMessage,
  type CreateMessageAuthor,
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
