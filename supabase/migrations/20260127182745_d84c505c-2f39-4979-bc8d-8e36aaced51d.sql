-- 1. Adicionar coluna de supervisores
ALTER TABLE partner_company_bu_associations 
ADD COLUMN IF NOT EXISTS supervisor_profile_ids UUID[] DEFAULT '{}';

-- 2. Comentário documentando a coluna
COMMENT ON COLUMN partner_company_bu_associations.supervisor_profile_ids IS 
  'Array de profiles.id que supervisionam esta empresa parceira na BU. 
   Supervisores são automaticamente adicionados como watchers em novos tickets.';

-- 3. Índice GIN para busca eficiente
CREATE INDEX IF NOT EXISTS idx_partner_bu_assoc_supervisors 
ON partner_company_bu_associations USING GIN (supervisor_profile_ids);

-- 4. Função: Adicionar supervisores como watchers ao criar ticket externo
CREATE OR REPLACE FUNCTION trg_add_supervisors_to_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supervisor_ids UUID[];
  v_supervisor_id UUID;
BEGIN
  -- Apenas tickets externos com partner_company_id
  IF NEW.type != 'external' OR NEW.partner_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar supervisores da empresa na BU
  SELECT COALESCE(supervisor_profile_ids, '{}') INTO v_supervisor_ids
  FROM partner_company_bu_associations
  WHERE partner_company_id = NEW.partner_company_id
    AND bu_id = NEW.bu_id
    AND is_active = true
    AND deleted_at IS NULL;

  -- Adicionar cada supervisor como watcher
  FOREACH v_supervisor_id IN ARRAY v_supervisor_ids
  LOOP
    -- Evitar duplicação (supervisor pode já ser creator/owner)
    IF NOT EXISTS (
      SELECT 1 FROM ticket_participants
      WHERE ticket_id = NEW.id
        AND profile_id = v_supervisor_id
    ) THEN
      INSERT INTO ticket_participants (
        bu_id, ticket_id, participant_type, profile_id, role, is_active
      ) VALUES (
        NEW.bu_id, NEW.id, 'internal_user', v_supervisor_id, 'watcher', true
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 5. Trigger após insert de ticket
DROP TRIGGER IF EXISTS trg_auto_add_supervisors ON tickets;
CREATE TRIGGER trg_auto_add_supervisors
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_add_supervisors_to_new_ticket();