CREATE OR REPLACE FUNCTION public.ticket_bu_matches(p_ticket_id uuid, p_bu_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM tickets WHERE id = p_ticket_id AND bu_id = p_bu_id);
$$;
REVOKE ALL ON FUNCTION public.ticket_bu_matches(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ticket_bu_matches(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Upload ticket attachments — scoped" ON storage.objects;
CREATE POLICY "Upload ticket attachments — scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.storage_path_uuid(storage.objects.name, 1) IS NOT NULL
  AND public.can_upload_ticket_attachment(public.storage_path_uuid(storage.objects.name, 2))
  AND public.ticket_bu_matches(public.storage_path_uuid(storage.objects.name, 2), public.storage_path_uuid(storage.objects.name, 1))
);