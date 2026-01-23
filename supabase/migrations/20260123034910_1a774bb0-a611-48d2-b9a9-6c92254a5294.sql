-- =====================================================
-- FIX: Remove duplicate ticket_messages INSERT policy that conflicts with v3
-- The v2 policy uses the OLD EXISTS-based approach which can cause issues
-- The v3 policy is the canonical one with correct can_view_ticket(ticket_id, my_profile_id()) signature
-- =====================================================

-- Drop the conflicting v2 policy (if exists)
DROP POLICY IF EXISTS "ticket_messages_insert_v2" ON public.ticket_messages;

-- Add comment explaining the canonical policy
COMMENT ON POLICY "ticket_messages_insert_v3" ON public.ticket_messages IS 
'CANONICAL INSERT POLICY (v3): Allows authenticated users to insert messages on tickets they can view.
- Internal users: author_type = internal_user, author_user_id = my_profile_id()
- External contacts: author_type = partner_contact, author_contact_id = get_user_partner_contact_id(auth.uid())
Note: Replaced v1/v2 which had signature issues with can_view_ticket.';