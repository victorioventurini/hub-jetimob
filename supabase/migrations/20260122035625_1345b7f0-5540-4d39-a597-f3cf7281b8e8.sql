
-- Fix can_view_ticket function with correct enum values (no 'squads', 'all' → 'bu_all')

CREATE OR REPLACE FUNCTION public.can_view_ticket(p_ticket_id uuid, p_profile_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_auth_uid uuid;
  v_partner_contact_id uuid;
BEGIN
  -- Get ticket info
  SELECT bu_id, visibility, visibility_team_ids, visibility_user_ids,
         created_by_user_id, owner_user_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF NOT FOUND THEN RETURN false; END IF;
  
  -- =====================================================
  -- CHECK 1: Internal user (has profile in BU)
  -- =====================================================
  IF p_profile_id IS NOT NULL AND is_profile_bu_member(p_profile_id, v_ticket.bu_id) THEN
    -- Creator or owner
    IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN 
      RETURN true; 
    END IF;

    -- Internal participant (by profile_id)
    IF EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id
        AND tp.profile_id = p_profile_id
        AND tp.is_active = true
    ) THEN RETURN true; END IF;

    -- Visibility rules for internal users
    CASE v_ticket.visibility
      WHEN 'bu_all' THEN RETURN true;
      WHEN 'teams' THEN
        RETURN EXISTS (
          SELECT 1 FROM public.user_team_memberships utm 
          WHERE utm.user_id = p_profile_id 
            AND utm.team_id = ANY(v_ticket.visibility_team_ids) 
            AND utm.is_active = true
        );
      WHEN 'users' THEN RETURN p_profile_id = ANY(v_ticket.visibility_user_ids);
      WHEN 'private' THEN 
        -- For private tickets, only creator, owner, and participants can view
        RETURN false;
      ELSE RETURN false;
    END CASE;
  END IF;
  
  -- =====================================================
  -- CHECK 2: External user (partner_contact) via auth.uid()
  -- =====================================================
  v_auth_uid := auth.uid();
  
  IF v_auth_uid IS NOT NULL THEN
    -- Get partner_contact_id for this auth user in the ticket's BU
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
    
    -- Check if external user is a participant (by partner_contact_id)
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
  -- CHECK 3: Profile-based user with partner_contact participation
  -- (User has profile but was added as external participant)
  -- =====================================================
  IF p_profile_id IS NOT NULL THEN
    -- Get the auth user id from the profile
    SELECT p.user_id INTO v_auth_uid
    FROM public.profiles p
    WHERE p.id = p_profile_id;
    
    IF v_auth_uid IS NOT NULL THEN
      -- Get partner_contact_id for this auth user
      SELECT pc.id INTO v_partner_contact_id
      FROM public.partner_contacts pc
      WHERE pc.user_id = v_auth_uid
        AND pc.status = 'active'
        AND pc.deleted_at IS NULL
      LIMIT 1;
      
      -- Check if this partner_contact is a participant
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
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_ticket IS 'Checks if a user (internal or external) can view a ticket. Handles edge case where user has both profile and partner_contact, checking participation via both identifiers.';
