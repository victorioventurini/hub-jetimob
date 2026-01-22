-- FIX: Restore the correct ticket_messages INSERT policy that allows both internal and external users
-- The previous policy was incorrectly overwritten and removed the author_type validation logic

-- Note: The policy was already dropped in the failed migration, so we just recreate it

-- Recreate the correct policy that supports:
-- 1. Internal users (author_type = 'internal_user' with author_user_id = my_profile_id())
-- 2. External contacts (author_type = 'partner_contact' with author_contact_id = get_user_partner_contact_id(auth.uid()))
CREATE POLICY "ticket_messages_insert_v3" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id) AND 
    can_view_ticket(ticket_id, my_profile_id()) AND
    (
      -- Internal users: author_type = 'internal_user' with their profile ID
      (author_type = 'internal_user' AND author_user_id = my_profile_id())
      OR
      -- External contacts: author_type = 'partner_contact' with their contact ID
      (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "ticket_messages_insert_v3" ON public.ticket_messages IS 
'Allows authenticated users to insert messages on tickets they can view. 
Internal users use author_user_id = my_profile_id().
External contacts use author_contact_id = get_user_partner_contact_id(auth.uid()).';