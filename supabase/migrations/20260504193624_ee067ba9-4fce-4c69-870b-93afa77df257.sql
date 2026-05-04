
-- =====================================================================
-- A) Estender current_bu_id() para externos (partner_contact_bu_associations)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.current_bu_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_header text;
  v_header_uuid uuid;
  v_bu uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_BU_CONTEXT';
  END IF;

  -- Read header
  BEGIN
    v_header := current_setting('request.headers', true)::jsonb->>'x-current-bu-id';
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_header := current_setting('request.headers', true)::json->>'x-current-bu-id';
    EXCEPTION WHEN OTHERS THEN
      v_header := NULL;
    END;
  END;

  IF v_header IS NOT NULL AND v_header <> '' THEN
    BEGIN
      v_header_uuid := v_header::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_header_uuid := NULL;
    END;

    IF v_header_uuid IS NOT NULL THEN
      -- Internal membership (user_id or profile_id)
      SELECT m.bu_id INTO v_bu
      FROM public.bu_user_memberships m
      WHERE (m.user_id = v_user_id OR m.profile_id = public.my_profile_id())
        AND m.bu_id = v_header_uuid
        AND m.deleted_at IS NULL
      LIMIT 1;

      IF v_bu IS NOT NULL THEN
        RETURN v_bu;
      END IF;

      -- External (partner_contact_bu_associations)
      SELECT pcba.bu_id INTO v_bu
      FROM public.partner_contact_bu_associations pcba
      JOIN public.partner_contacts pc ON pc.id = pcba.partner_contact_id
      WHERE pc.user_id = v_user_id
        AND pc.deleted_at IS NULL
        AND pc.status = 'active'
        AND pcba.bu_id = v_header_uuid
        AND pcba.is_active = true
        AND pcba.deleted_at IS NULL
      LIMIT 1;

      IF v_bu IS NOT NULL THEN
        RETURN v_bu;
      END IF;
    END IF;
  END IF;

  -- Fallback: default internal membership
  SELECT bu_id INTO v_bu
  FROM public.bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = public.my_profile_id())
    AND is_default = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_bu IS NOT NULL THEN
    RETURN v_bu;
  END IF;

  -- Fallback: first active internal membership
  SELECT bu_id INTO v_bu
  FROM public.bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = public.my_profile_id())
    AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_bu IS NOT NULL THEN
    RETURN v_bu;
  END IF;

  -- Fallback: first active external partner association
  SELECT pcba.bu_id INTO v_bu
  FROM public.partner_contact_bu_associations pcba
  JOIN public.partner_contacts pc ON pc.id = pcba.partner_contact_id
  WHERE pc.user_id = v_user_id
    AND pc.deleted_at IS NULL
    AND pc.status = 'active'
    AND pcba.is_active = true
    AND pcba.deleted_at IS NULL
  ORDER BY pcba.created_at
  LIMIT 1;

  IF v_bu IS NOT NULL THEN
    RETURN v_bu;
  END IF;

  RAISE EXCEPTION 'NO_BU_CONTEXT';
END;
$function$;

COMMENT ON FUNCTION public.current_bu_id() IS
'[v3.1] Resolves current BU. Recognizes internal memberships and external partner_contact_bu_associations. Used by is_current_bu() and BU-scope trigger.';

-- =====================================================================
-- B) Limpar policies legadas e canonizar bucket ticket-attachments
-- =====================================================================

-- Drop legacy/duplicated policies
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view ticket attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Upload ticket attachments — canonical" ON storage.objects;
DROP POLICY IF EXISTS "Read ticket attachments — canonical" ON storage.objects;
DROP POLICY IF EXISTS "Delete own ticket attachments — internal" ON storage.objects;
DROP POLICY IF EXISTS "Delete ticket attachments — external participant" ON storage.objects;

-- INSERT (upload): authenticated; real authorization is enforced at public.ticket_attachments
CREATE POLICY "Upload ticket attachments — canonical"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
);

-- SELECT (read via signed URL): authenticated; record visibility is gated by ticket_attachments_select_v3
CREATE POLICY "Read ticket attachments — canonical"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
);

-- DELETE — internal owner / platform admin
CREATE POLICY "Delete own ticket attachments — internal"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.ticket_attachments ta
      WHERE ta.file_url = storage.objects.name
        AND ta.uploaded_by_user_id = public.my_profile_id()
    )
  )
);

-- DELETE — external partner_contact participant (rollback of failed upload)
CREATE POLICY "Delete ticket attachments — external participant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.ticket_participants tp
    JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.is_active = true
      AND pc.user_id = auth.uid()
      AND pc.deleted_at IS NULL
      AND (storage.foldername(storage.objects.name))[2] = tp.ticket_id::text
  )
);

-- =====================================================================
-- C) Reafirmar role da policy de INSERT em ticket_attachments
-- =====================================================================
DROP POLICY IF EXISTS ticket_attachments_insert_v4 ON public.ticket_attachments;

CREATE POLICY ticket_attachments_insert_v4
ON public.ticket_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'tickets.attachment.create:bu')
    OR EXISTS (
      SELECT 1 FROM ticket_participants tp
      WHERE tp.ticket_id = ticket_attachments.ticket_id
        AND tp.profile_id = my_profile_id()
        AND tp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM ticket_participants tp
      JOIN partner_contacts pc ON pc.id = tp.partner_contact_id
      WHERE tp.ticket_id = ticket_attachments.ticket_id
        AND tp.is_active = true
        AND pc.user_id = auth.uid()
    )
  )
);
