// =============================================
// MÓDULO TICKETS - EXPORTS
// =============================================

// Types
export * from './types';

// Hooks
export { useTickets, useTicket, useMyTickets, useCreateTicket, useUpdateTicket, useUpdateTicketStatus, useDeleteTicket } from './hooks/useTickets';
export { useTicketMessages, useCreateMessage, useEditMessage, useDeleteMessage } from './hooks/useTicketMessages';
export { usePartnerCompanies, usePartnerCompany, useCreatePartnerCompany, useUpdatePartnerCompany, useDeletePartnerCompany, usePartnerContacts, usePartnerContact, useCreatePartnerContact, useUpdatePartnerContact, useDeletePartnerContact } from './hooks/usePartners';
export { useTicketCategories, useCreateTicketCategory, useUpdateTicketCategory, useDeleteTicketCategory, useTicketSubcategories, useCreateTicketSubcategory, useUpdateTicketSubcategory, useDeleteTicketSubcategory } from './hooks/useTicketCategories';

// Components
export { TicketsLayout } from './components/TicketsLayout';
export { TicketCard } from './components/TicketCard';
export { TicketFilters } from './components/TicketFilters';

// Pages (lazy loaded in App.tsx)
// TicketsPage, TicketsListPage, CreateTicketPage, TicketDetailPage
