CREATE OR REPLACE FUNCTION public.can_upload_ticket_attachment(p_ticket_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_ticket_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id AND tp.is_active AND tp.profile_id = public.my_profile_id())
    OR EXISTS (SELECT 1 FROM ticket_participants tp
      JOIN partner_contacts pc ON pc.id = tp.partner_contact_id
      WHERE tp.ticket_id = p_ticket_id AND tp.is_active AND pc.user_id = auth.uid() AND pc.deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM tickets t
      WHERE t.id = p_ticket_id AND public.has_permission(public.my_profile_id(), t.bu_id, 'tickets.attachment.create:bu'))
  );
$$;
REVOKE ALL ON FUNCTION public.can_upload_ticket_attachment(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_upload_ticket_attachment(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Upload ticket attachments — scoped" ON storage.objects;
CREATE POLICY "Upload ticket attachments — scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.storage_path_uuid(storage.objects.name, 1) IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE false) IS NOT NULL
  AND public.can_upload_ticket_attachment(public.storage_path_uuid(storage.objects.name, 2))
);

DROP POLICY IF EXISTS ticket_attachments_insert_v4 ON public.ticket_attachments;
CREATE POLICY ticket_attachments_insert_v4 ON public.ticket_attachments FOR INSERT TO authenticated
WITH CHECK (public.is_current_bu(bu_id) AND public.can_upload_ticket_attachment(ticket_id));