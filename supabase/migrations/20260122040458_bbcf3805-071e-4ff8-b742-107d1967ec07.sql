-- =====================================================
-- Fix: get_visible_ticket_ids_for_impersonation for external users
-- TCR: Identity Hardening v2.1 + can_view_ticket parity
-- =====================================================
-- Problem: RPC only checks profile_id for participation, but external users
-- are added via partner_contact_id. Must be consistent with can_view_ticket.

CREATE OR REPLACE FUNCTION public.get_visible_ticket_ids_for_impersonation(p_profile_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_result uuid[];
  v_auth_uid uuid;
  v_partner_contact_id uuid;
BEGIN
  -- Get auth user_id from profile to check partner_contact participation
  SELECT p.user_id INTO v_auth_uid
  FROM public.profiles p
  WHERE p.id = p_profile_id;
  
  -- Get partner_contact_id for hybrid user check
  IF v_auth_uid IS NOT NULL THEN
    SELECT pc.id INTO v_partner_contact_id
    FROM public.partner_contacts pc
    WHERE pc.user_id = v_auth_uid
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
    LIMIT 1;
  END IF;

  SELECT ARRAY_AGG(DISTINCT t.id) INTO v_result 
  FROM public.tickets t
  WHERE t.deleted_at IS NULL AND (
    -- Creator or owner (internal user)
    t.created_by_user_id = p_profile_id 
    OR t.owner_user_id = p_profile_id
    
    -- Internal participant (by profile_id)
    OR EXISTS (
      SELECT 1 FROM public.ticket_participants tp 
      WHERE tp.ticket_id = t.id 
        AND tp.profile_id = p_profile_id 
        AND tp.is_active = true
    )
    
    -- External participant (by partner_contact_id)
    OR (v_partner_contact_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ticket_participants tp 
      WHERE tp.ticket_id = t.id 
        AND tp.partner_contact_id = v_partner_contact_id 
        AND tp.is_active = true
    ))
    
    -- Visibility: bu_all (only for BU members)
    OR (t.visibility = 'bu_all' AND is_profile_bu_member(p_profile_id, t.bu_id))
    
    -- Visibility: teams
    OR (t.visibility = 'teams' AND EXISTS (
      SELECT 1 FROM public.user_team_memberships utm 
      WHERE utm.user_id = p_profile_id 
        AND utm.team_id = ANY(t.visibility_team_ids) 
        AND utm.is_active = true
    ))
    
    -- Visibility: users
    OR (t.visibility = 'users' AND p_profile_id = ANY(t.visibility_user_ids))
  );
  
  RETURN COALESCE(v_result, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.get_visible_ticket_ids_for_impersonation(uuid) IS 
'Returns ticket IDs visible to a profile during impersonation. Supports internal users, external contacts (partner_contact_id), and hybrid users. Consistent with can_view_ticket logic.';