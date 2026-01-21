-- Fix RLS policy for ticket_attachments SELECT to allow external contacts who can view the ticket
-- Current policy only checks is_profile_bu_member + has_permission which excludes external users

DROP POLICY IF EXISTS ticket_attachments_select_v2 ON public.ticket_attachments;

CREATE POLICY ticket_attachments_select_v3
ON public.ticket_attachments
FOR SELECT
USING (
  is_current_bu(bu_id) AND can_view_ticket(my_profile_id(), ticket_id)
);

COMMENT ON POLICY ticket_attachments_select_v3 ON public.ticket_attachments IS 
'Allows anyone who can view the ticket to also view its attachments (internal users + external contacts)';