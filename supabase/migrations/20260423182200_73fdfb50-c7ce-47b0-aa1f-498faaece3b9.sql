
-- 1) Canonical helper: reflects v_bu_active_profiles (membership OR primary BU)
CREATE OR REPLACE FUNCTION public.is_profile_bu_member_or_primary(
  p_profile_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bu_user_memberships m
    WHERE m.profile_id = p_profile_id
      AND m.bu_id = p_bu_id
      AND m.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.bu_id = p_bu_id
      AND p.deleted_at IS NULL
      AND p.employment_status <> 'terminated'
  );
$$;

-- 2) search_bu_users_for_mention: swap gate to canonical helper
CREATE OR REPLACE FUNCTION public.search_bu_users_for_mention(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL::text,
  p_limit integer DEFAULT 8
)
RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, photo_url text, team_name text, user_type text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_limit integer;
BEGIN
  v_profile_id := public.my_profile_id();

  IF NOT public.is_profile_bu_member_or_primary(v_profile_id, p_bu_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));

  RETURN QUERY
  SELECT
    v.id,
    v.user_id,
    v.display_name,
    v.work_email AS email,
    v.photo_url,
    v.team_name,
    v.user_type
  FROM public.v_bu_active_profiles v
  WHERE v.bu_id = p_bu_id
    AND v.user_type = 'internal'
    AND (
      p_search_term IS NULL
      OR p_search_term = ''
      OR public.f_unaccent(lower(v.display_name)) ILIKE '%' || public.f_unaccent(lower(p_search_term)) || '%'
    )
  ORDER BY v.display_name
  LIMIT v_limit;
END;
$function$;

-- 3) search_mention_candidates: align internal branch with v_bu_active_profiles
-- (was INNER JOIN bu_user_memberships → excluded primary-only users)
CREATE OR REPLACE FUNCTION public.search_mention_candidates(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL::text,
  p_external_company_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(id uuid, entity_id uuid, entity_type text, display_name text, email text, photo_url text, team_name text, external_company_name text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Internal users from BU directory (membership OR primary BU)
  SELECT 
    v.id,
    v.id AS entity_id,
    'internal_user'::text AS entity_type,
    v.display_name,
    v.work_email AS email,
    v.photo_url,
    v.team_name,
    NULL::text AS external_company_name
  FROM public.v_bu_active_profiles v
  WHERE v.bu_id = p_bu_id
    AND v.user_type = 'internal'
    AND (
      p_search_term IS NULL 
      OR v.display_name ILIKE '%' || p_search_term || '%'
      OR v.work_email ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- External contacts (unchanged)
  SELECT 
    pc.id,
    pc.id AS entity_id,
    'partner_contact'::text AS entity_type,
    pc.name AS display_name,
    pc.email,
    NULL::text AS photo_url,
    NULL::text AS team_name,
    ec.name AS external_company_name
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
  LEFT JOIN public.external_companies ec ON ec.id = pc.external_company_id
  WHERE pcba.bu_id = p_bu_id
    AND pcba.is_active = true
    AND pcba.deleted_at IS NULL
    AND pc.deleted_at IS NULL
    AND pc.status = 'active'
    AND (
      p_external_company_id IS NULL 
      OR pc.external_company_id = p_external_company_id
    )
    AND (
      p_search_term IS NULL 
      OR pc.name ILIKE '%' || p_search_term || '%'
      OR pc.email ILIKE '%' || p_search_term || '%'
    )
  
  ORDER BY display_name
  LIMIT p_limit;
END;
$function$;
