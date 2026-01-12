-- Fix can_view_ticket() to use profile_id instead of auth.uid()
-- Following DEVELOPMENT_STANDARDS.md identity convention:
-- - Domain columns (created_by_user_id, assigned_to_user_id, visibility_user_ids) store profiles.id
-- - Team/squad membership tables store auth.users.id
-- The function must convert between them appropriately

-- 1. Drop existing function
DROP FUNCTION IF EXISTS public.can_view_ticket(uuid, uuid);

-- 2. Recreate function with correct identity handling
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_profile_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Creator or assignee always can view (these store profiles.id)
  IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.assigned_to_user_id = p_profile_id THEN
    RETURN true;
  END IF;
  
  -- Participants (watchers, assignees, requesters) can always view
  -- ticket_participants.user_id stores profiles.id per domain convention
  IF EXISTS (
    SELECT 1 FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.user_id = p_profile_id
      AND tp.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check visibility rules
  CASE v_ticket.visibility
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'team' THEN
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
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL 
              AND p_profile_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.can_view_ticket(uuid, uuid) IS 
  'Check if a user (by profile_id) can view a ticket.
   IMPORTANT: First parameter is profile_id, NOT auth.uid().
   - Domain columns (created_by, assigned_to, visibility_user_ids) store profiles.id
   - Team/squad memberships use auth.users.id (converted internally)
   Per DEVELOPMENT_STANDARDS.md identity convention.';

-- 3. Update RLS policies to use my_profile_id() instead of auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tickets they have access to" ON public.tickets;
DROP POLICY IF EXISTS "BU users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Ticket owners and admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "BU admins can delete tickets" ON public.tickets;

-- Recreate with correct identity handling
CREATE POLICY "Users can view tickets they have access to"
ON public.tickets FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(my_profile_id(), id));

CREATE POLICY "BU users can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) 
  AND created_by_user_id = my_profile_id()
);

CREATE POLICY "Ticket owners and admins can update tickets"
ON public.tickets FOR UPDATE
USING (
  is_bu_admin(auth.uid(), bu_id)
  OR is_platform_admin(auth.uid())
  OR created_by_user_id = my_profile_id()
  OR owner_user_id = my_profile_id()
);

CREATE POLICY "BU admins can delete tickets"
ON public.tickets FOR DELETE
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- 4. Update ticket_participants policies
DROP POLICY IF EXISTS "Users can view participants of tickets they can see" ON public.ticket_participants;
DROP POLICY IF EXISTS "Ticket owners and admins can manage participants" ON public.ticket_participants;

CREATE POLICY "Users can view participants of tickets they can see"
ON public.ticket_participants FOR SELECT
USING (can_view_ticket(my_profile_id(), ticket_id));

CREATE POLICY "Ticket owners and admins can manage participants"
ON public.ticket_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (
        is_bu_admin(auth.uid(), t.bu_id)
        OR is_platform_admin(auth.uid())
        OR t.created_by_user_id = my_profile_id()
        OR t.owner_user_id = my_profile_id()
      )
  )
);

-- 5. Update ticket_messages policies
DROP POLICY IF EXISTS "Users can view messages of tickets they can see" ON public.ticket_messages;
DROP POLICY IF EXISTS "Participants can create messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Authors can edit their messages" ON public.ticket_messages;

CREATE POLICY "Users can view messages of tickets they can see"
ON public.ticket_messages FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(my_profile_id(), ticket_id));

CREATE POLICY "Participants can create messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  can_view_ticket(my_profile_id(), ticket_id)
  AND (
    (author_type = 'internal_user' AND author_user_id = my_profile_id())
    OR (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
  )
);

CREATE POLICY "Authors can edit their messages"
ON public.ticket_messages FOR UPDATE
USING (
  author_user_id = my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))
  )
);

-- 6. Update ticket_attachments policies
DROP POLICY IF EXISTS "Users can view attachments of tickets they can see" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Participants can upload attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Admins can delete attachments" ON public.ticket_attachments;

CREATE POLICY "Users can view attachments of tickets they can see"
ON public.ticket_attachments FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(my_profile_id(), ticket_id));

CREATE POLICY "Participants can upload attachments"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  can_view_ticket(my_profile_id(), ticket_id)
  AND uploaded_by_user_id = my_profile_id()
);

CREATE POLICY "Admins can delete attachments"
ON public.ticket_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))
  )
);