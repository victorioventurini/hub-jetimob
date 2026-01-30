-- Clean up legacy comments in remaining functions

-- 1. apply_ticket_assignment - remove legacy comments
CREATE OR REPLACE FUNCTION apply_ticket_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  IF NEW.type = 'external' AND NEW.external_company_id IS NOT NULL AND NEW.category_id IS NOT NULL THEN
    IF NEW.assignment_source = 'manual' THEN
      RETURN NEW;
    END IF;
    
    v_contact_id := resolve_ticket_assignee(
      NEW.bu_id,
      NEW.external_company_id,
      NEW.category_id,
      NEW.subcategory_id
    );
    
    IF v_contact_id IS NOT NULL THEN
      NEW.assigned_contact_id := v_contact_id;
      NEW.assignment_source := 'contact_capability';
    ELSE
      NEW.assignment_source := 'routing_fallback';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. search_mention_candidates - update comment
CREATE OR REPLACE FUNCTION search_mention_candidates(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL,
  p_external_company_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  entity_type text,
  display_name text,
  email text,
  photo_url text,
  team_name text,
  external_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Internal users from BU
  SELECT 
    p.id,
    p.id AS entity_id,
    'internal_user'::text AS entity_type,
    p.display_name,
    p.work_email AS email,
    p.photo_url,
    t.name AS team_name,
    NULL::text AS external_company_name
  FROM profiles p
  JOIN bu_user_memberships bum ON bum.profile_id = p.id
  LEFT JOIN teams t ON t.id = p.team_id
  WHERE bum.bu_id = p_bu_id
    AND bum.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.employment_status != 'terminated'
    AND (
      p_search_term IS NULL 
      OR p.display_name ILIKE '%' || p_search_term || '%'
      OR p.work_email ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- External contacts (from external company or all if null)
  SELECT 
    pc.id,
    pc.id AS entity_id,
    'partner_contact'::text AS entity_type,
    pc.name AS display_name,
    pc.email,
    NULL::text AS photo_url,
    NULL::text AS team_name,
    ec.name AS external_company_name
  FROM partner_contacts pc
  JOIN partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
  LEFT JOIN external_companies ec ON ec.id = pc.external_company_id
  WHERE pcba.bu_id = p_bu_id
    AND pcba.is_active = true
    AND pcba.deleted_at IS NULL
    AND pc.deleted_at IS NULL
    AND pc.status = 'active'
    AND (
      p_external_company_id IS NULL 
      OR pc.external_company_id = p_external_company_id
    )
    AND (
      p_search_term IS NULL 
      OR pc.name ILIKE '%' || p_search_term || '%'
      OR pc.email ILIKE '%' || p_search_term || '%'
    )
  
  ORDER BY display_name
  LIMIT p_limit;
END;
$$;

-- 3. trg_add_supervisors_to_new_ticket - remove legacy comments  
CREATE OR REPLACE FUNCTION trg_add_supervisors_to_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_internal_ids UUID[];
  v_external_ids UUID[];
  v_supervisor_id UUID;
BEGIN
  -- Only external tickets with external_company_id
  IF NEW.type != 'external' OR NEW.external_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get supervisors from external_company_bu_associations
  SELECT 
    COALESCE(supervisor_profile_ids, '{}'),
    COALESCE(supervisor_contact_ids, '{}')
  INTO v_internal_ids, v_external_ids
  FROM external_company_bu_associations
  WHERE external_company_id = NEW.external_company_id
    AND bu_id = NEW.bu_id
    AND is_active = true
    AND deleted_at IS NULL;

  -- Add internal supervisors (profiles) as watchers
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

  -- Add external supervisors (contacts) as watchers
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

-- 4. validate_external_ticket_partner_service - remove legacy comments
CREATE OR REPLACE FUNCTION validate_external_ticket_partner_service()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_active_in_bu BOOLEAN;
  v_has_mapping BOOLEAN;
BEGIN
  -- Only validate external tickets
  IF NEW.type != 'external' THEN 
    RETURN NEW; 
  END IF;
  
  -- External ticket requires external company
  IF NEW.external_company_id IS NULL THEN
    RAISE EXCEPTION 'Tickets externos requerem uma empresa parceira';
  END IF;
  
  -- Verify partner is active in the ticket's BU
  SELECT EXISTS (
    SELECT 1 FROM external_company_bu_associations
    WHERE external_company_id = NEW.external_company_id
      AND bu_id = NEW.bu_id
      AND is_active = true
      AND deleted_at IS NULL
  ) INTO v_partner_active_in_bu;
  
  IF NOT v_partner_active_in_bu THEN
    RAISE EXCEPTION 'Esse parceiro não está ativo nesta unidade de negócio';
  END IF;
  
  -- Verify partner serves the category (global mapping)
  SELECT EXISTS (
    SELECT 1 FROM partner_service_mappings psm
    WHERE psm.external_company_id = NEW.external_company_id
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