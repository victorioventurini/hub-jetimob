/**
 * Suppliers Module Types
 * Reutiliza external_companies com role='supplier'
 */

export interface Supplier {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  document_type: 'cpf' | 'cnpj' | null;
  person_type: 'pf' | 'pj' | null;
  status: 'active' | 'inactive';
}

export interface SupplierBuAssociation {
  id: string;
  is_active: boolean;
  notes: string | null;
  external_company: Supplier;
}

export interface SearchedCompany {
  id: string;
  name: string;
  document: string | null;
  document_type: 'cpf' | 'cnpj' | null;
  person_type: 'pf' | 'pj' | null;
  status: 'active' | 'inactive';
}
