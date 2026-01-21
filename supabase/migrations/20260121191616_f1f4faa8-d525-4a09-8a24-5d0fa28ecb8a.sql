-- Drop the restrictive policy and create one that supports both internal users and external contacts
DROP POLICY IF EXISTS "ticket_messages_insert_v1" ON public.ticket_messages;

CREATE POLICY "ticket_messages_insert_v2" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id) AND 
    can_view_ticket(my_profile_id(), ticket_id) AND
    (
      -- Internal users: author_type = 'internal_user' with their profile ID
      (author_type = 'internal_user' AND author_user_id = my_profile_id())
      OR
      -- External contacts: author_type = 'partner_contact' with their contact ID
      (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "ticket_messages_insert_v2" ON public.ticket_messages IS 
'Allows authenticated users to insert messages on tickets they can view. 
Internal users use author_user_id = my_profile_id().
External contacts use author_contact_id = get_user_partner_contact_id(auth.uid()).';