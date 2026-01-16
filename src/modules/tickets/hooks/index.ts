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

// Messages
export { 
  useTicketMessages, 
  useCreateMessage, 
  useEditMessage, 
  useDeleteMessage 
} from './useTicketMessages';

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

// Summary
export { useTicketsSummary } from './useTicketsSummary';
