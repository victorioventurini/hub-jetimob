-- Fix RLS policy for ticket_attachments INSERT to allow external contacts who are participants
-- Current policy only checks has_permission which doesn't work for external users

DROP POLICY IF EXISTS ticket_attachments_insert_v2 ON public.ticket_attachments;

CREATE POLICY ticket_attachments_insert_v3
ON public.ticket_attachments
FOR INSERT
WITH CHECK (
  is_current_bu(bu_id) AND (
    -- Internal users with permission
    has_permission(my_profile_id(), bu_id, 'tickets.attachment.create:bu')
    OR
    -- External contacts who are participants of the ticket
    EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      INNER JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
      WHERE tp.ticket_id = ticket_attachments.ticket_id
        AND tp.is_active = true
        AND pc.user_id = auth.uid()
    )
  )
);

COMMENT ON POLICY ticket_attachments_insert_v3 ON public.ticket_attachments IS 
'Allows internal users with permission OR external contacts who are active participants to upload attachments';