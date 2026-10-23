DROP POLICY IF EXISTS project_attachments_read_scoped ON storage.objects;
CREATE POLICY project_attachments_read_scoped ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-attachments'
  AND public.storage_path_uuid(storage.objects.name, 1) IS NOT NULL
  AND public.is_profile_bu_member(public.my_profile_id(), public.storage_path_uuid(storage.objects.name, 1))
  AND EXISTS (SELECT 1 FROM public.projects p
    WHERE p.id = public.storage_path_uuid(storage.objects.name, 2)
      AND p.bu_id = public.storage_path_uuid(storage.objects.name, 1)
      AND p.deleted_at IS NULL)
);