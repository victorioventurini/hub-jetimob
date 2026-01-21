/**
 * Tickets Query Keys
 */
export const ticketsKeys = {
  all: (buId: string | null) => ['tickets', buId] as const,

  /** Prefix helper to invalidate all ticket lists for a BU (independente de filtros). */
  listPrefix: (buId: string | null) => ['tickets', 'list', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) =>
    ['tickets', 'list', buId, filters] as const,

  /** Prefix helper to invalidate all "my tickets" queries for a BU (independente do profile). */
  myTicketsPrefix: (buId: string | null) => ['my-tickets', buId] as const,
  myTickets: (buId: string | null, profileId?: string) => ['my-tickets', buId, profileId] as const,

  detail: (ticketId: string | null) => ['ticket', ticketId] as const,
  messages: (ticketId: string) => ['tickets', 'messages', ticketId] as const,
  attachments: (ticketId: string | null) => ['ticket-attachments', ticketId] as const,
  categories: (buId: string | null, scope?: string) => ['tickets', 'categories', buId, scope] as const,
  subcategories: (buId: string | null, categoryId?: string) => ['tickets', 'subcategories', buId, categoryId] as const,
  categoriesPrefix: (buId: string | null) => ['tickets', 'categories', buId] as const,
  subcategoriesPrefix: (buId: string | null) => ['tickets', 'subcategories', buId] as const,
  partners: (buId: string | null) => ['tickets', 'partners', buId] as const,
  partnerCompany: (id: string | null) => ['tickets', 'partner-company', id] as const,
  partnerContacts: (buId: string | null, companyId?: string) =>
    ['partner-contacts', buId, companyId] as const,
  partnerContact: (id: string | null) => ['partner-contact', id] as const,
  partnerContactByEmail: (email: string | null) => ['partner-contact-by-email', email?.toLowerCase()] as const,
  partnerContactBuAssociations: (contactId: string | null) => ['partner-contact-bu-associations', contactId] as const,
  partnerContactHover: (contactId: string | null) => ['partner-contact-hover', contactId] as const,
  partnerServices: (buId: string | null, companyId?: string) =>
    ['partner-services', buId, companyId] as const,
  partnerCategories: (companyId?: string) => ['partner-categories', companyId] as const,
  partnerSubcategories: (companyId?: string, categoryId?: string) =>
    ['partner-subcategories', companyId, categoryId] as const,
  partnerServiceMappings: (buId: string | null, companyId?: string) =>
    ['partner-service-mappings', buId, companyId] as const,
  partnerServicesPrefix: () => ['partner-services'] as const,
  partnerCategoriesPrefix: () => ['partner-categories'] as const,
  partnerSubcategoriesPrefix: () => ['partner-subcategories'] as const,
  routingRules: (buId: string | null) => ['tickets', 'routing-rules', buId] as const,
  internalRoutingRules: (buId: string | null) => ['tickets', 'internal-routing-rules', buId] as const,
  contactCapabilities: (buId: string | null, contactId?: string) =>
    ['tickets', 'contact-capabilities', buId, contactId] as const,
  companyContactCapabilities: (buId: string | null, companyId?: string) =>
    ['tickets', 'company-contact-capabilities', buId, companyId] as const,
  partnerContactProfile: (contactId: string) =>
    ['tickets', 'partner-contact-profile', contactId] as const,
  contactCapabilitiesPrefix: () => ['contact-capabilities'] as const,
  companyContactCapabilitiesPrefix: () => ['company-contact-capabilities'] as const,
  
  // Summary (aggregated dashboard data)
  summary: (buId: string | null, teamId?: string) => 
    ['tickets', 'summary', buId, teamId] as const,
  
  // Pending tickets for a contact (migration flow)
  pendingForContact: (contactId: string | null) =>
    ['tickets', 'pending-for-contact', contactId] as const,
} as const;
