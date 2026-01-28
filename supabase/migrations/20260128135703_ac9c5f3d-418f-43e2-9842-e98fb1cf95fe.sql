-- 1. Adicionar coluna de supervisores externos
ALTER TABLE partner_company_bu_associations 
ADD COLUMN IF NOT EXISTS supervisor_contact_ids UUID[] DEFAULT '{}';

-- 2. Comentário documentando a coluna
COMMENT ON COLUMN partner_company_bu_associations.supervisor_contact_ids IS 
  'Array de partner_contacts.id que supervisionam esta empresa parceira na BU. 
   Supervisores externos são automaticamente adicionados como watchers em novos tickets.';

-- 3. Índice GIN para busca eficiente
CREATE INDEX IF NOT EXISTS idx_partner_bu_assoc_supervisor_contacts 
ON partner_company_bu_associations USING GIN (supervisor_contact_ids);

-- 4. Atualizar função para adicionar ambos os tipos de supervisores
CREATE OR REPLACE FUNCTION trg_add_supervisors_to_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_internal_ids UUID[];
  v_external_ids UUID[];
  v_supervisor_id UUID;
BEGIN
  -- Apenas tickets externos com partner_company_id
  IF NEW.type != 'external' OR NEW.partner_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar supervisores da empresa na BU
  SELECT 
    COALESCE(supervisor_profile_ids, '{}'),
    COALESCE(supervisor_contact_ids, '{}')
  INTO v_internal_ids, v_external_ids
  FROM partner_company_bu_associations
  WHERE partner_company_id = NEW.partner_company_id
    AND bu_id = NEW.bu_id
    AND is_active = true
    AND deleted_at IS NULL;

  -- Adicionar supervisores internos (profiles) como watchers
  FOREACH v_supervisor_id IN ARRAY v_internal_ids
  LOOP
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

  -- Adicionar supervisores externos (contacts) como watchers
  FOREACH v_supervisor_id IN ARRAY v_external_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM ticket_participants
      WHERE ticket_id = NEW.id
        AND partner_contact_id = v_supervisor_id
    ) THEN
      INSERT INTO ticket_participants (
        bu_id, ticket_id, participant_type, partner_contact_id, role, is_active
      ) VALUES (
        NEW.bu_id, NEW.id, 'partner_contact', v_supervisor_id, 'watcher', true
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;