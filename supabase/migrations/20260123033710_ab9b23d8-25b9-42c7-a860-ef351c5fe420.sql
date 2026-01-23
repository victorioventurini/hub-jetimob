-- Fix can_view_ticket: user_team_memberships does NOT have is_active column
-- Per SCHEMA_QUICK_REFERENCE.md: "Não possui coluna is_active! Membership é implícita pela existência do registro"

CREATE OR REPLACE FUNCTION public.can_view_ticket(p_ticket_id uuid, p_profile_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_auth_uid uuid;
  v_partner_contact_id uuid;
  v_is_bu_member boolean := false;
BEGIN
  -- Get ticket info
  SELECT bu_id, visibility, visibility_team_ids, visibility_user_ids,
         created_by_user_id, owner_user_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Check if profile is BU member
  IF p_profile_id IS NOT NULL THEN
    v_is_bu_member := is_profile_bu_member(p_profile_id, v_ticket.bu_id);
  END IF;
  
  -- =====================================================
  -- CHECK 1: Creator or owner (direct access)
  -- =====================================================
  IF p_profile_id IS NOT NULL AND v_is_bu_member THEN
    IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN 
      RETURN true; 
    END IF;
  END IF;
  
  -- =====================================================
  -- CHECK 2: Internal participant (by profile_id)
  -- =====================================================
  IF p_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id
        AND tp.profile_id = p_profile_id
        AND tp.is_active = true
    ) THEN RETURN true; END IF;
  END IF;
  
  -- =====================================================
  -- CHECK 3: External participant (by partner_contact_id via auth.uid)
  -- =====================================================
  v_auth_uid := auth.uid();
  
  IF v_auth_uid IS NOT NULL THEN
    SELECT pc.id INTO v_partner_contact_id
    FROM public.partner_contacts pc
    JOIN public.partner_contact_bu_associations pcba 
      ON pcba.partner_contact_id = pc.id 
      AND pcba.bu_id = v_ticket.bu_id
      AND pcba.is_active = true
      AND pcba.deleted_at IS NULL
    WHERE pc.user_id = v_auth_uid
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
    LIMIT 1;
    
    IF v_partner_contact_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.ticket_participants tp
        WHERE tp.ticket_id = p_ticket_id
          AND tp.partner_contact_id = v_partner_contact_id
          AND tp.is_active = true
      ) THEN 
        RETURN true; 
      END IF;
    END IF;
  END IF;
  
  -- =====================================================
  -- CHECK 4: Profile-based user with partner_contact participation
  -- (User has profile but was added as external participant)
  -- =====================================================
  IF p_profile_id IS NOT NULL THEN
    SELECT p.user_id INTO v_auth_uid
    FROM public.profiles p
    WHERE p.id = p_profile_id;
    
    IF v_auth_uid IS NOT NULL THEN
      SELECT pc.id INTO v_partner_contact_id
      FROM public.partner_contacts pc
      WHERE pc.user_id = v_auth_uid
        AND pc.status = 'active'
        AND pc.deleted_at IS NULL
      LIMIT 1;
      
      IF v_partner_contact_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.ticket_participants tp
          WHERE tp.ticket_id = p_ticket_id
            AND tp.partner_contact_id = v_partner_contact_id
            AND tp.is_active = true
        ) THEN 
          RETURN true; 
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- =====================================================
  -- CHECK 5: Visibility rules for internal BU members (non-participants)
  -- =====================================================
  IF v_is_bu_member THEN
    CASE v_ticket.visibility
      WHEN 'bu_all' THEN RETURN true;
      WHEN 'teams' THEN
        -- FIX: user_team_memberships does NOT have is_active column
        -- Membership is implicit by record existence (per SCHEMA_QUICK_REFERENCE.md)
        RETURN EXISTS (
          SELECT 1 FROM public.user_team_memberships utm 
          WHERE utm.user_id = p_profile_id 
            AND utm.team_id = ANY(v_ticket.visibility_team_ids)
        );
      WHEN 'users' THEN RETURN p_profile_id = ANY(v_ticket.visibility_user_ids);
      WHEN 'private' THEN RETURN false;
      ELSE RETURN false;
    END CASE;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_ticket(uuid, uuid) IS 
'Verifica se um usuário pode visualizar um ticket.
Fixed v2.66.1: Removed is_active check from user_team_memberships (column does not exist per SCHEMA_QUICK_REFERENCE.md)';