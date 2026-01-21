
-- =============================================
-- MIGRAÇÃO COMPLETA: Partner Companies Global com CPF/CNPJ
-- =============================================

-- FASE 1: Adicionar campos de documento à partner_companies
ALTER TABLE partner_companies
  ADD COLUMN IF NOT EXISTS person_type TEXT CHECK (person_type IN ('pf', 'pj')) DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('cpf', 'cnpj'));

-- Criar índice único para documento (apenas para registros ativos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_companies_document_unique 
  ON partner_companies(document) 
  WHERE document IS NOT NULL AND deleted_at IS NULL;

-- FASE 2: Criar tabela de associação BU
CREATE TABLE IF NOT EXISTS partner_company_bu_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_company_id UUID NOT NULL REFERENCES partner_companies(id) ON DELETE CASCADE,
  bu_id UUID NOT NULL REFERENCES bu_units(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT uq_partner_company_bu UNIQUE (partner_company_id, bu_id)
);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_partner_company_bu_associations_updated_at
  BEFORE UPDATE ON partner_company_bu_associations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para partner_company_bu_associations
ALTER TABLE partner_company_bu_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_bu_assoc_select_policy" ON partner_company_bu_associations
  FOR SELECT USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "partner_bu_assoc_insert_policy" ON partner_company_bu_associations
  FOR INSERT WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'partners.company.manage:bu')
  );

CREATE POLICY "partner_bu_assoc_update_policy" ON partner_company_bu_associations
  FOR UPDATE USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.manage:bu')
  );

CREATE POLICY "partner_bu_assoc_delete_policy" ON partner_company_bu_associations
  FOR DELETE USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.manage:bu')
  );

-- FASE 3: Migrar dados existentes - criar associações (SEM copiar created_by inválido)
INSERT INTO partner_company_bu_associations (partner_company_id, bu_id, is_active)
SELECT 
  pc.id, 
  pc.bu_id, 
  (pc.status = 'active')
FROM partner_companies pc
WHERE pc.deleted_at IS NULL
  AND pc.bu_id IS NOT NULL
ON CONFLICT (partner_company_id, bu_id) DO NOTHING;

-- FASE 4: Tornar partner_service_mappings global (bu_id opcional)
ALTER TABLE partner_service_mappings ALTER COLUMN bu_id DROP NOT NULL;

-- FASE 5: Atualizar RLS de partner_companies para ser global
-- Remover políticas antigas
DROP POLICY IF EXISTS "partner_companies_select" ON partner_companies;
DROP POLICY IF EXISTS "partner_companies_insert" ON partner_companies;
DROP POLICY IF EXISTS "partner_companies_update" ON partner_companies;
DROP POLICY IF EXISTS "partner_companies_delete" ON partner_companies;
DROP POLICY IF EXISTS "Users can view partner companies in their BU" ON partner_companies;
DROP POLICY IF EXISTS "Users can manage partner companies in their BU" ON partner_companies;

-- Novas políticas para acesso global (via associações)
CREATE POLICY "partner_companies_global_select" ON partner_companies
  FOR SELECT USING (
    -- Pode ver se tem associação com alguma BU que o usuário pertence
    EXISTS (
      SELECT 1 FROM partner_company_bu_associations pba
      WHERE pba.partner_company_id = partner_companies.id
        AND pba.deleted_at IS NULL
        AND is_profile_bu_member(my_profile_id(), pba.bu_id)
    )
    -- Ou se foi criador (para empresas recém-criadas ainda sem associação)
    OR partner_companies.created_by = my_profile_id()
  );

CREATE POLICY "partner_companies_global_insert" ON partner_companies
  FOR INSERT WITH CHECK (
    -- Qualquer usuário autenticado pode criar (associação será feita depois)
    my_profile_id() IS NOT NULL
  );

CREATE POLICY "partner_companies_global_update" ON partner_companies
  FOR UPDATE USING (
    -- Pode editar se tem permissão em alguma BU associada
    EXISTS (
      SELECT 1 FROM partner_company_bu_associations pba
      WHERE pba.partner_company_id = partner_companies.id
        AND pba.deleted_at IS NULL
        AND has_permission(my_profile_id(), pba.bu_id, 'partners.company.manage:bu')
    )
  );

CREATE POLICY "partner_companies_global_delete" ON partner_companies
  FOR DELETE USING (
    -- Apenas admins podem deletar
    EXISTS (
      SELECT 1 FROM partner_company_bu_associations pba
      WHERE pba.partner_company_id = partner_companies.id
        AND pba.deleted_at IS NULL
        AND has_permission(my_profile_id(), pba.bu_id, 'partners.company.manage:bu')
    )
  );

-- FASE 6: Criar view para serviços efetivos por BU
CREATE OR REPLACE VIEW v_partner_services_by_bu AS
SELECT 
  psm.id,
  pba.bu_id,
  psm.partner_company_id,
  pc.name AS partner_company_name,
  pc.person_type,
  pc.document,
  pc.document_type,
  psm.category_id,
  tc.name AS category_name,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  psm.status
FROM partner_service_mappings psm
JOIN partner_companies pc ON pc.id = psm.partner_company_id AND pc.deleted_at IS NULL
JOIN partner_company_bu_associations pba ON pba.partner_company_id = pc.id 
  AND pba.is_active = true 
  AND pba.deleted_at IS NULL
JOIN ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
LEFT JOIN ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
WHERE psm.deleted_at IS NULL;

-- FASE 7: Atualizar trigger de validação de tickets externos
CREATE OR REPLACE FUNCTION validate_external_ticket_partner_service()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_active_in_bu BOOLEAN;
  v_has_mapping BOOLEAN;
BEGIN
  -- Só valida tickets externos
  IF NEW.type != 'external' THEN 
    RETURN NEW; 
  END IF;
  
  -- Ticket externo requer empresa parceira
  IF NEW.partner_company_id IS NULL THEN
    RAISE EXCEPTION 'Tickets externos requerem uma empresa parceira';
  END IF;
  
  -- Verificar se parceiro está ativo na BU do ticket
  SELECT EXISTS (
    SELECT 1 FROM partner_company_bu_associations
    WHERE partner_company_id = NEW.partner_company_id
      AND bu_id = NEW.bu_id
      AND is_active = true
      AND deleted_at IS NULL
  ) INTO v_partner_active_in_bu;
  
  IF NOT v_partner_active_in_bu THEN
    RAISE EXCEPTION 'Esse parceiro não está ativo nesta unidade de negócio';
  END IF;
  
  -- Verificar se parceiro atende a categoria (mapeamento global)
  SELECT EXISTS (
    SELECT 1 FROM partner_service_mappings psm
    WHERE psm.partner_company_id = NEW.partner_company_id
      AND psm.category_id = NEW.category_id
      AND (psm.subcategory_id IS NULL OR psm.subcategory_id = NEW.subcategory_id)
      AND psm.status = 'active'
      AND psm.deleted_at IS NULL
  ) INTO v_has_mapping;
  
  IF NOT v_has_mapping THEN
    RAISE EXCEPTION 'Parceiro não atende esta categoria/subcategoria';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_validate_external_ticket ON tickets;
CREATE TRIGGER trg_validate_external_ticket
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION validate_external_ticket_partner_service();
