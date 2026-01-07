/**
 * External Dashboard Types
 * TCR v2.4.0 - External User Dashboard
 */

// Single external contact record
export interface ExternalContactRecord {
  contactId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  buId: string;
  buName: string;
  buLegalName: string | null;
}

// External user's partner contact info (for backward compatibility)
export type ExternalUserInfo = ExternalContactRecord;

// External user with all BU associations
export interface ExternalUserData {
  /** All active partner_contacts for this user */
  contacts: ExternalContactRecord[];
  /** All BU IDs the external user has access to */
  allBuIds: string[];
  /** Primary contact (first one found, for compatibility) */
  primaryContact: ExternalContactRecord | null;
  /** True if user has any external contact records */
  isExternal: boolean;
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
