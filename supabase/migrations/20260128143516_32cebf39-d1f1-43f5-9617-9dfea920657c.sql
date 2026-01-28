-- ============================================================================
-- EXTERNAL COMPANIES MIGRATION
-- Unifica partner_companies em external_companies com suporte a múltiplos papéis
-- ============================================================================

-- 1. Renomear tabela principal
ALTER TABLE partner_companies RENAME TO external_companies;

-- 2. Renomear tabela de associações
ALTER TABLE partner_company_bu_associations RENAME TO external_company_bu_associations;

-- 3. Renomear coluna FK na tabela de associações
ALTER TABLE external_company_bu_associations RENAME COLUMN partner_company_id TO external_company_id;

-- 4. Adicionar coluna de papel com default 'partner' para dados existentes
ALTER TABLE external_company_bu_associations
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'partner' NOT NULL;

-- 5. Constraint para valores válidos de role
ALTER TABLE external_company_bu_associations
  ADD CONSTRAINT chk_bu_assoc_role CHECK (role IN ('partner', 'supplier', 'customer'));

-- 6. Índice único: uma empresa só pode ter um papel específico por BU (soft-delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_company_bu_role 
  ON external_company_bu_associations(external_company_id, bu_id, role)
  WHERE deleted_at IS NULL;

-- 7. Renomear colunas FK em tabelas relacionadas
ALTER TABLE partner_contacts RENAME COLUMN partner_company_id TO external_company_id;
ALTER TABLE partner_service_mappings RENAME COLUMN partner_company_id TO external_company_id;
ALTER TABLE ticket_routing_rules RENAME COLUMN partner_company_id TO external_company_id;
ALTER TABLE tickets RENAME COLUMN partner_company_id TO external_company_id;

-- 8. Atualizar comentários nas tabelas para documentação
COMMENT ON TABLE external_companies IS 'Empresas externas globais (parceiros, fornecedores, clientes). Única por CPF/CNPJ.';
COMMENT ON TABLE external_company_bu_associations IS 'Associações de empresas externas com BUs, incluindo papel (partner/supplier/customer).';
COMMENT ON COLUMN external_company_bu_associations.role IS 'Papel da empresa na BU: partner (serviços/tickets), supplier (fornecedor), customer (cliente futuro)';