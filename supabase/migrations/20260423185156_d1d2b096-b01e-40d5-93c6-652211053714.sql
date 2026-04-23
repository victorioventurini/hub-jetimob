-- 1) current_bu_id() robusto: parser tolerante + aceita profile_id
CREATE OR REPLACE FUNCTION public.current_bu_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_header text;
  v_header_uuid uuid;
  v_bu uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_BU_CONTEXT';
  END IF;

  -- Read header (try jsonb first, then json fallback)
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
      -- Aceita membership tanto via user_id quanto via profile_id (cobre perfis com user_id NULL)
      SELECT m.bu_id INTO v_bu
      FROM public.bu_user_memberships m
      WHERE (m.user_id = v_user_id OR m.profile_id = public.my_profile_id())
        AND m.bu_id = v_header_uuid
        AND m.deleted_at IS NULL
      LIMIT 1;

      IF v_bu IS NOT NULL THEN
        RETURN v_bu;
      END IF;
    END IF;
  END IF;

  -- Fallback: is_default
  SELECT bu_id INTO v_bu
  FROM public.bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = public.my_profile_id())
    AND is_default = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_bu IS NOT NULL THEN
    RETURN v_bu;
  END IF;

  -- Último recurso: primeira membership ativa
  SELECT bu_id INTO v_bu
  FROM public.bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = public.my_profile_id())
    AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_bu IS NOT NULL THEN
    RETURN v_bu;
  END IF;

  RAISE EXCEPTION 'NO_BU_CONTEXT';
END;
$$;

-- 2) projects_update: WITH CHECK relaxado (mantém isolamento via profile_has_bu_access + trigger)
DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
FOR UPDATE
USING (
  public.is_current_bu(bu_id) AND (
    owner_id = public.my_profile_id()
    OR public.is_bu_admin(auth.uid(), bu_id)
    OR public.is_leader_of_project_owner(public.my_profile_id(), owner_id, bu_id)
  )
)
WITH CHECK (
  public.profile_has_bu_access(public.my_profile_id(), bu_id) AND (
    owner_id = public.my_profile_id()
    OR public.is_bu_admin(auth.uid(), bu_id)
    OR public.is_leader_of_project_owner(public.my_profile_id(), owner_id, bu_id)
  )
);