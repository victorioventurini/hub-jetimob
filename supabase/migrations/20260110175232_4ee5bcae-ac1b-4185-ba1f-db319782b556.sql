-- ===========================================
-- Auto-add mentioned users as ticket participants
-- ===========================================

-- 1. Create trigger function to auto-add participant on mention
CREATE OR REPLACE FUNCTION public.auto_add_mention_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If mentioning internal user
  IF NEW.mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id,
      ticket_id,
      participant_type,
      user_id,
      role,
      is_active
    )
    VALUES (
      NEW.bu_id,
      NEW.ticket_id,
      'internal_user',
      NEW.mentioned_user_id,
      'watcher',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- If mentioning external contact
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id,
      ticket_id,
      participant_type,
      partner_contact_id,
      role,
      is_active
    )
    VALUES (
      NEW.bu_id,
      NEW.ticket_id,
      'partner_contact',
      NEW.mentioned_contact_id,
      'watcher',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on ticket_mentions
DROP TRIGGER IF EXISTS trg_auto_add_mention_as_participant ON public.ticket_mentions;
CREATE TRIGGER trg_auto_add_mention_as_participant
  AFTER INSERT ON public.ticket_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_mention_as_participant();

-- 3. Create unique indexes to prevent duplicate participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_participants_unique_user
  ON public.ticket_participants (ticket_id, user_id)
  WHERE user_id IS NOT NULL AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_participants_unique_contact
  ON public.ticket_participants (ticket_id, partner_contact_id)
  WHERE partner_contact_id IS NOT NULL AND is_active = true;

-- 4. Update can_view_ticket() to consider participants
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_bu_id uuid;
BEGIN
  v_bu_id := current_bu_id();
  
  SELECT 
    t.id,
    t.created_by_user_id,
    t.assigned_to_user_id,
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
  
  -- Creator or assignee always can view
  IF v_ticket.created_by_user_id = p_user_id OR v_ticket.assigned_to_user_id = p_user_id THEN
    RETURN true;
  END IF;
  
  -- Participants (watchers, assignees, requesters) can always view
  IF EXISTS (
    SELECT 1 FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.user_id = p_user_id
      AND tp.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check visibility rules
  CASE v_ticket.visibility
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'team' THEN
      IF v_ticket.visibility_team_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_team_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.user_team_memberships utm
          WHERE utm.user_id = p_user_id
            AND utm.team_id = ANY(v_ticket.visibility_team_ids)
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      IF v_ticket.visibility_squad_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_squad_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.squad_memberships sm
          WHERE sm.user_id = p_user_id
            AND sm.squad_id = ANY(v_ticket.visibility_squad_ids)
            AND sm.deleted_at IS NULL
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      IF v_ticket.visibility_user_ids IS NOT NULL 
         AND p_user_id = ANY(v_ticket.visibility_user_ids) THEN
        RETURN true;
      END IF;
      
      RETURN false;
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL 
              AND p_user_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;