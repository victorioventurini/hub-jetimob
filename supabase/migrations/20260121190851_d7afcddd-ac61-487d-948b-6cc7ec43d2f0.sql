
-- Update can_view_ticket to also check partner_contact participants
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_profile_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_bu_id uuid;
  v_user_id uuid;
BEGIN
  v_bu_id := current_bu_id();
  
  -- Convert profile_id to auth user_id for team/squad checks
  v_user_id := user_id_from_profile_id(p_profile_id);
  
  SELECT 
    t.id,
    t.created_by_user_id,
    t.owner_user_id,
    t.visibility,
    t.visibility_team_ids,
    t.visibility_squad_ids,
    t.visibility_user_ids
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id AND t.bu_id = v_bu_id AND t.deleted_at IS NULL;
  
  IF v_ticket IS NULL THEN
    RETURN false;
  END IF;
  
  -- Creator or owner always can view (these store profiles.id)
  IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN
    RETURN true;
  END IF;
  
  -- Internal user participants (watchers, assignees, requesters) can always view
  -- ticket_participants.user_id stores profiles.id per domain convention
  IF EXISTS (
    SELECT 1 FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.user_id = p_profile_id
      AND tp.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- External contact participants (assignees, watchers) can view if they have a profile
  -- partner_contacts.user_id links to auth.users.id, profiles.user_id also links to auth.users.id
  -- So we check if the profile's user_id matches any active partner_contact participant's user_id
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ticket_participants tp
    INNER JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.ticket_id = p_ticket_id
      AND tp.partner_contact_id IS NOT NULL
      AND tp.is_active = true
      AND pc.user_id = v_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check visibility rules
  CASE v_ticket.visibility
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'bu_all' THEN
      -- Everyone in the BU can view
      RETURN true;
    
    WHEN 'teams' THEN
      -- Team/squad memberships use auth.users.id
      IF v_ticket.visibility_team_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_team_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.user_team_memberships utm
          WHERE utm.user_id = v_user_id
            AND utm.team_id = ANY(v_ticket.visibility_team_ids)
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      IF v_ticket.visibility_squad_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_squad_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.squad_memberships sm
          WHERE sm.user_id = v_user_id
            AND sm.squad_id = ANY(v_ticket.visibility_squad_ids)
            AND sm.deleted_at IS NULL
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      -- visibility_user_ids stores profiles.id per domain convention
      IF v_ticket.visibility_user_ids IS NOT NULL 
         AND p_profile_id = ANY(v_ticket.visibility_user_ids) THEN
        RETURN true;
      END IF;
      
      RETURN false;
    
    WHEN 'users' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL 
              AND p_profile_id = ANY(v_ticket.visibility_user_ids));
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL 
              AND p_profile_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.can_view_ticket IS 'Checks if a profile can view a ticket based on: 1) being creator/owner, 2) being an internal participant, 3) being an external contact participant with a profile, 4) visibility rules (bu_all, teams, users, private)';
