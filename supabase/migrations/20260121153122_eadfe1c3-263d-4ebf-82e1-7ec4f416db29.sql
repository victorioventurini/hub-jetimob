
-- =====================================================
-- PARTNER_COMPANIES: Estrutura Global com CPF/CNPJ único
-- =====================================================

-- 1. Tornar bu_id nullable (parceiros são globais)
ALTER TABLE partner_companies 
  ALTER COLUMN bu_id DROP NOT NULL;

-- 2. Criar índice único para document (CPF/CNPJ único globalmente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_companies_document_unique 
  ON partner_companies (document) 
  WHERE document IS NOT NULL AND deleted_at IS NULL;

-- 3. Migrar parceiros existentes para tabela de associação (se não existirem)
INSERT INTO partner_company_bu_associations (partner_company_id, bu_id, is_active, created_at, updated_at)
SELECT 
  pc.id,
  pc.bu_id,
  CASE WHEN pc.status = 'active' THEN true ELSE false END,
  pc.created_at,
  NOW()
FROM partner_companies pc
WHERE pc.bu_id IS NOT NULL
  AND pc.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM partner_company_bu_associations pba 
    WHERE pba.partner_company_id = pc.id AND pba.bu_id = pc.bu_id
  );

-- 4. Atualizar RLS policies para partner_companies (global)
DROP POLICY IF EXISTS "Partner companies are viewable by BU members" ON partner_companies;
DROP POLICY IF EXISTS "Partner companies can be created by BU admins" ON partner_companies;
DROP POLICY IF EXISTS "Partner companies can be updated by BU admins" ON partner_companies;
DROP POLICY IF EXISTS "Partner companies can be deleted by BU admins" ON partner_companies;

-- Parceiros são globais, visíveis para todos autenticados
CREATE POLICY "Partner companies are viewable by authenticated users"
  ON partner_companies FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Criar/atualizar parceiros: usuário autenticado com role admin em alguma BU
CREATE POLICY "Partner companies can be managed by admins"
  ON partner_companies FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM bu_user_memberships bum
      WHERE bum.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND bum.role_in_bu = 'admin'
        AND bum.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bu_user_memberships bum
      WHERE bum.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND bum.role_in_bu = 'admin'
        AND bum.deleted_at IS NULL
    )
  );

-- 5. Atualizar RLS para partner_company_bu_associations
DROP POLICY IF EXISTS "Partner BU associations are viewable by BU members" ON partner_company_bu_associations;
DROP POLICY IF EXISTS "Partner BU associations can be managed by BU admins" ON partner_company_bu_associations;

-- Visualizar: membros da BU podem ver associações
CREATE POLICY "Partner BU associations viewable by BU members"
  ON partner_company_bu_associations FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    (
      bu_id = (current_setting('app.current_bu_id', true))::uuid
      OR
      EXISTS (
        SELECT 1 FROM bu_user_memberships bum
        WHERE bum.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND bum.bu_id = partner_company_bu_associations.bu_id
          AND bum.deleted_at IS NULL
      )
    )
  );

-- Gerenciar: admins da BU podem criar/atualizar associações
CREATE POLICY "Partner BU associations managed by BU admins"
  ON partner_company_bu_associations FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM bu_user_memberships bum
      WHERE bum.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND bum.bu_id = partner_company_bu_associations.bu_id
        AND bum.role_in_bu = 'admin'
        AND bum.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bu_user_memberships bum
      WHERE bum.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND bum.bu_id = partner_company_bu_associations.bu_id
        AND bum.role_in_bu = 'admin'
        AND bum.deleted_at IS NULL
    )
  );

-- 6. Criar função para buscar parceiro por documento
CREATE OR REPLACE FUNCTION public.find_partner_by_document(p_document text)
RETURNS TABLE (
  id uuid,
  name text,
  legal_name text,
  person_type text,
  document text,
  document_type text,
  status text,
  allowed_domains text[],
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.id,
    pc.name,
    pc.legal_name,
    pc.person_type,
    pc.document,
    pc.document_type,
    pc.status::text,
    pc.allowed_domains,
    pc.notes
  FROM partner_companies pc
  WHERE pc.document = regexp_replace(p_document, '[^0-9]', '', 'g')
    AND pc.deleted_at IS NULL
  LIMIT 1;
$$;

-- 7. Comentários
COMMENT ON TABLE partner_companies IS 'Empresas parceiras globais (não BU-scoped). Associação com BUs via partner_company_bu_associations.';
COMMENT ON COLUMN partner_companies.bu_id IS 'DEPRECATED: Mantido por compatibilidade. Usar partner_company_bu_associations para associações.';
COMMENT ON COLUMN partner_companies.document IS 'CPF ou CNPJ (apenas números). Único globalmente.';
