-- Fix trigger that references non-existent column partner_company_id (should be external_company_id)
CREATE OR REPLACE FUNCTION trg_add_supervisors_to_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_internal_ids UUID[];
  v_external_ids UUID[];
  v_supervisor_id UUID;
BEGIN
  -- Apenas tickets externos com external_company_id (FIX: was partner_company_id)
  IF NEW.type != 'external' OR NEW.external_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar supervisores da empresa na BU
  SELECT 
    COALESCE(supervisor_profile_ids, '{}'),
    COALESCE(supervisor_contact_ids, '{}')
  INTO v_internal_ids, v_external_ids
  FROM partner_company_bu_associations
  WHERE partner_company_id = NEW.external_company_id  -- FIX: was partner_company_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;