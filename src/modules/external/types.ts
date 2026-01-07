/**
 * External Dashboard Types
 * TCR v2.4.0 - External User Dashboard
 */

// External user's partner contact info
export interface ExternalUserInfo {
  contactId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  buId: string;
  buName: string;
  buLegalName: string | null;
}

// Ticket summary for external user
export interface ExternalTicketSummary {
  id: string;
  title: string;
  status: 'waiting' | 'paused' | 'in_progress' | 'done' | 'discarded';
  categoryName: string | null;
  subcategoryName: string | null;
  updatedAt: string;
  createdAt: string;
}

// External dashboard stats
export interface ExternalDashboardStats {
  totalOpen: number;
  awaitingResponse: number;
}

// Company context with categories
export interface ExternalCompanyContext {
  companyId: string;
  companyName: string;
  categories: Array<{
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
    }>;
  }>;
}
