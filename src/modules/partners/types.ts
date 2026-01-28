/**
 * Partners Module - Types
 * 
 * Global partner company types (not BU-scoped)
 */

export type PersonType = 'pf' | 'pj';
export type DocumentType = 'cpf' | 'cnpj';
export type PartnerStatus = 'active' | 'inactive';
export type ExternalCompanyRole = 'partner' | 'supplier' | 'customer';

export interface PartnerBuAssociation {
  id: string;
  external_company_id: string;
  bu_id: string;
  is_active: boolean;
  notes: string | null;
  role: ExternalCompanyRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  bu?: {
    id: string;
    name: string;
  };
}

export interface GlobalPartnerCompany {
  id: string;
  name: string;
  legal_name: string | null;
  person_type: PersonType;
  document: string | null;
  document_type: DocumentType | null;
  allowed_domains: string[];
  notes: string | null;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Legacy (will be removed)
  bu_id?: string | null;
  // Joined
  bu_associations?: PartnerBuAssociation[];
  // Computed
  active_bus_count?: number;
}

export interface CreatePartnerCompanyData {
  name: string;
  legal_name?: string;
  person_type: PersonType;
  document?: string;
  document_type?: DocumentType;
  allowed_domains?: string[];
  notes?: string;
}

export interface UpdatePartnerCompanyData {
  id: string;
  name?: string;
  legal_name?: string;
  person_type?: PersonType;
  document?: string;
  document_type?: DocumentType;
  allowed_domains?: string[];
  notes?: string;
  status?: PartnerStatus;
}

export interface PartnerBuAssociationData {
  partner_company_id: string;
  bu_id: string;
  is_active?: boolean;
  notes?: string;
}

export interface PartnerSearchResult {
  id: string;
  name: string;
  document: string | null;
  person_type: PersonType;
  document_type: DocumentType | null;
  status: PartnerStatus;
}
