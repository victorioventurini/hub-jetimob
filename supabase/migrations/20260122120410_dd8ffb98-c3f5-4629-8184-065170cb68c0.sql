-- ============================================================
-- FIX: Watcher message/attachment permissions + Status change restrictions
-- ============================================================
-- 1. Allow internal participants (including watchers) to upload attachments
-- 2. Restrict ticket updates (status changes) to creator/owner/responsible only
-- ============================================================

-- 1. DROP and recreate ticket_attachments_insert policy
-- Current: only allows tickets.attachment.create:bu OR partner_contact participants
-- New: also allows internal_user participants (watchers, assignees, etc.)
DROP POLICY IF EXISTS ticket_attachments_insert_v3 ON public.ticket_attachments;

CREATE POLICY ticket_attachments_insert_v4 ON public.ticket_attachments
  FOR INSERT
  TO public
  WITH CHECK (
    is_current_bu(bu_id) AND (
      -- Option 1: Has explicit attachment permission
      has_permission(my_profile_id(), bu_id, 'tickets.attachment.create:bu')
      OR
      -- Option 2: Is an internal participant of this ticket
      EXISTS (
        SELECT 1 FROM public.ticket_participants tp
        WHERE tp.ticket_id = ticket_attachments.ticket_id
          AND tp.profile_id = my_profile_id()
          AND tp.is_active = true
      )
      OR
      -- Option 3: Is an external contact participant
      EXISTS (
        SELECT 1 
        FROM public.ticket_participants tp
        JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
        WHERE tp.ticket_id = ticket_attachments.ticket_id
          AND tp.is_active = true
          AND pc.user_id = auth.uid()
      )
    )
  );

-- 2. Create function to check if user can update ticket status
CREATE OR REPLACE FUNCTION public.can_update_ticket_status(
  p_ticket_id uuid,
  p_profile_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_contact_profile_id uuid;
BEGIN
  -- Get ticket info
  SELECT created_by_user_id, owner_user_id, assigned_contact_id, type, bu_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Check 1: Is creator
  IF v_ticket.created_by_user_id = p_profile_id THEN
    RETURN true;
  END IF;

  -- Check 2: Is owner (internal responsible)
  IF v_ticket.owner_user_id = p_profile_id THEN
    RETURN true;
  END IF;

  -- Check 3: For external tickets, check if is the assigned contact (via profile link)
  IF v_ticket.type = 'external' AND v_ticket.assigned_contact_id IS NOT NULL THEN
    -- Get the profile linked to this contact via user_id
    SELECT pr.id INTO v_contact_profile_id
    FROM public.partner_contacts pc
    JOIN public.profiles pr ON pr.user_id = pc.user_id
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL;
    
    IF v_contact_profile_id = p_profile_id THEN
      RETURN true;
    END IF;
  END IF;

  -- Check 4: Has tickets.settings.manage permission (admin override)
  IF has_permission(p_profile_id, v_ticket.bu_id, 'tickets.settings.manage:bu') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_update_ticket_status IS 
'Checks if a profile can update ticket status. Only creator, owner (responsible), assigned contact, or admins can change status.';

-- 3. Update tickets_update_policy to be more restrictive for status changes
-- Note: We can't easily do column-level policies, so we'll handle this in frontend
-- But we'll add a comment for future reference

COMMENT ON POLICY tickets_update_policy ON public.tickets IS 
'General update policy. Status changes should be further restricted in frontend to creator/owner/responsible only. Use can_update_ticket_status() for validation.';