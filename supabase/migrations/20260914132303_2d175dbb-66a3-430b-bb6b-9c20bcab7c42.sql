-- Helper: extrai UUID de um segmento do caminho do arquivo, sem quebrar em caminhos legados
CREATE OR REPLACE FUNCTION public.storage_path_uuid(p_name text, p_idx int)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE
  parts text[];
  seg text;
BEGIN
  parts := storage.foldername(p_name);
  IF parts IS NULL OR array_length(parts, 1) IS NULL OR array_length(parts, 1) < p_idx THEN
    RETURN NULL;
  END IF;
  seg := parts[p_idx];
  IF seg !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN seg::uuid;
END;
$$;

-- ============ ticket-attachments ============
DROP POLICY IF EXISTS "Read ticket attachments — canonical" ON storage.objects;
DROP POLICY IF EXISTS "Upload ticket attachments — canonical" ON storage.objects;

CREATE POLICY "Read ticket attachments — scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    public.is_platform_admin(auth.uid())
    OR (
      public.storage_path_uuid(name, 2) IS NOT NULL
      AND public.can_view_ticket(public.storage_path_uuid(name, 2), public.my_profile_id())
    )
  )
);

CREATE POLICY "Upload ticket attachments — scoped"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.storage_path_uuid(name, 1) IS NOT NULL
  AND public.storage_path_uuid(name, 2) IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = public.storage_path_uuid(name, 2)
        AND tp.profile_id = public.my_profile_id()
        AND tp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
      WHERE tp.ticket_id = public.storage_path_uuid(name, 2)
        AND tp.is_active = true
        AND pc.user_id = auth.uid()
        AND pc.deleted_at IS NULL
    )
    OR public.has_permission(
         public.my_profile_id(),
         public.storage_path_uuid(name, 1),
         'tickets.attachment.create:bu'
       )
  )
);

-- ============ project-attachments ============
DROP POLICY IF EXISTS project_attachments_read ON storage.objects;
DROP POLICY IF EXISTS project_attachments_upload ON storage.objects;

CREATE POLICY project_attachments_read_scoped
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-attachments'
  AND public.storage_path_uuid(name, 1) IS NOT NULL
  AND public.is_profile_bu_member(public.my_profile_id(), public.storage_path_uuid(name, 1))
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = public.storage_path_uuid(name, 2)
      AND p.bu_id = public.storage_path_uuid(name, 1)
      AND p.deleted_at IS NULL
  )
);

CREATE POLICY project_attachments_upload_scoped
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-attachments'
  AND public.storage_path_uuid(name, 1) IS NOT NULL
  AND public.is_profile_bu_member(public.my_profile_id(), public.storage_path_uuid(name, 1))
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = public.storage_path_uuid(name, 2)
      AND p.bu_id = public.storage_path_uuid(name, 1)
      AND p.deleted_at IS NULL
  )
);