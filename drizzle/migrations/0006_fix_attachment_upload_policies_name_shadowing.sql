DROP POLICY IF EXISTS "Upload ticket attachments — scoped" ON storage.objects;
CREATE POLICY "Upload ticket attachments — scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.storage_path_uuid(storage.objects.name, 1) IS NOT NULL
  AND public.storage_path_uuid(storage.objects.name, 2) IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = public.storage_path_uuid(storage.objects.name, 2)
        AND tp.profile_id = public.my_profile_id() AND tp.is_active = true)
    OR EXISTS (SELECT 1 FROM public.ticket_participants tp
      JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
      WHERE tp.ticket_id = public.storage_path_uuid(storage.objects.name, 2)
        AND tp.is_active = true AND pc.user_id = auth.uid() AND pc.deleted_at IS NULL)
    OR public.has_permission(public.my_profile_id(), public.storage_path_uuid(storage.objects.name, 1), 'tickets.attachment.create:bu')
  )
);

DROP POLICY IF EXISTS project_attachments_upload_scoped ON storage.objects;
CREATE POLICY project_attachments_upload_scoped ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-attachments'
  AND public.storage_path_uuid(storage.objects.name, 1) IS NOT NULL
  AND public.is_profile_bu_member(public.my_profile_id(), public.storage_path_uuid(storage.objects.name, 1))
  AND EXISTS (SELECT 1 FROM public.projects p
    WHERE p.id = public.storage_path_uuid(storage.objects.name, 2)
      AND p.bu_id = public.storage_path_uuid(storage.objects.name, 1)
      AND p.deleted_at IS NULL)
);