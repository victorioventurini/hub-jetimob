
-- ============================================================
-- Constraint: Unicidade de email por BU em partner_contacts
-- Objetivo: Prevenir duplicados acidentais, permitindo multi-BU
-- ============================================================

-- 1. Remover duplicados mantendo o registro mais recente (updated_at)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY bu_id, email 
           ORDER BY updated_at DESC, created_at DESC
         ) as rn
  FROM partner_contacts
  WHERE email IS NOT NULL 
    AND deleted_at IS NULL
)
UPDATE partner_contacts
SET deleted_at = now()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Criar índice único parcial (exclui soft-deleted)
CREATE UNIQUE INDEX partner_contacts_email_bu_unique 
ON partner_contacts (bu_id, email) 
WHERE deleted_at IS NULL AND email IS NOT NULL;

-- 3. Documentar a constraint
COMMENT ON INDEX partner_contacts_email_bu_unique IS 
'Garante unicidade de email por BU. Contatos podem existir em múltiplas BUs com o mesmo email. Exclui registros soft-deleted.';
