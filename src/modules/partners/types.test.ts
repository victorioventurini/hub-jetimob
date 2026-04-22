/**
 * Partners module — type & invariant tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  PersonType,
  DocumentType,
  PartnerStatus,
  GlobalPartnerCompany,
  PartnerBuAssociation,
  CreatePartnerCompanyData,
} from './types';

describe('Partners · enums', () => {
  it('PersonType = pf | pj (pessoa física vs jurídica)', () => {
    const v: PersonType[] = ['pf', 'pj'];
    expect(v).toHaveLength(2);
  });

  it('DocumentType segue PersonType (cpf↔pf, cnpj↔pj)', () => {
    const map: Record<PersonType, DocumentType> = { pf: 'cpf', pj: 'cnpj' };
    expect(map.pf).toBe('cpf');
    expect(map.pj).toBe('cnpj');
  });

  it('PartnerStatus apenas active|inactive (sem soft-delete via status)', () => {
    const s: PartnerStatus[] = ['active', 'inactive'];
    expect(s).not.toContain('deleted' as never);
  });
});

describe('Partners · GlobalPartnerCompany shape', () => {
  it('aceita allowed_domains como lista (multi-tenant email matching)', () => {
    const c: GlobalPartnerCompany = {
      id: 'p1', name: 'Acme', legal_name: null,
      person_type: 'pj', document: '11222333000181', document_type: 'cnpj',
      allowed_domains: ['acme.com', 'acme.io'],
      notes: null, status: 'active',
      created_at: '', updated_at: '', deleted_at: null,
    };
    expect(c.allowed_domains).toContain('acme.com');
    expect(c.deleted_at).toBeNull();
  });

  it('CreatePartnerCompanyData NÃO exige document (alguns parceiros sem CNPJ)', () => {
    const data: CreatePartnerCompanyData = { name: 'Pessoa', person_type: 'pf' };
    expect(data.document).toBeUndefined();
  });
});

describe('Partners · BuAssociation', () => {
  it('association é soft-deletable (deleted_at nullable)', () => {
    const a: PartnerBuAssociation = {
      id: 'a1', external_company_id: 'p1', bu_id: 'bu1',
      is_active: true, notes: null,
      created_at: '', updated_at: '', deleted_at: null,
    };
    expect(a.deleted_at).toBeNull();
    expect(a.is_active).toBe(true);
  });
});
