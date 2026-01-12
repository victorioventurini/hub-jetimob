
-- FIX: Improve search_mention_candidates to show both internal and external users
-- When a partner_company_id is provided, ensure external contacts are visible

CREATE OR REPLACE FUNCTION public.search_mention_candidates(
  p_bu_id uuid,
  p_partner_company_id uuid DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  entity_id uuid,
  entity_type text,
  display_name text,
  email text,
  photo_url text,
  team_name text,
  partner_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text;
  v_internal_limit integer;
  v_external_limit integer;
BEGIN
  -- Normalize search term (remove accents for matching) using f_unaccent wrapper
  v_search := public.f_unaccent(lower(trim(coalesce(p_search_term, ''))));
  
  -- When filtering by partner company, split limit between internal and external
  -- This ensures external contacts are always visible in suggestions
  IF p_partner_company_id IS NOT NULL THEN
    v_internal_limit := GREATEST(p_limit / 2, 5);
    v_external_limit := GREATEST(p_limit / 2, 5);
  ELSE
    -- No partner filter: show mostly internal (default behavior)
    v_internal_limit := p_limit;
    v_external_limit := p_limit;
  END IF;
  
  RETURN QUERY
  WITH internal_users AS (
    SELECT 
      p.id AS id,
      p.id AS entity_id,
      'internal_user'::text AS entity_type,
      coalesce(p.display_name, concat_ws(' ', p.first_name, p.last_name), split_part(coalesce(p.work_email, p.email), '@', 1)) AS display_name,
      coalesce(p.work_email, p.email) AS email,
      p.photo_url AS photo_url,
      t.name AS team_name,
      NULL::text AS partner_company_name,
      1 AS priority
    FROM profiles p
    INNER JOIN bu_user_memberships bum ON bum.profile_id = p.id 
      AND bum.bu_id = p_bu_id 
      AND bum.deleted_at IS NULL
    LEFT JOIN teams t ON t.id = p.team_id
    WHERE 
      p.deleted_at IS NULL
      AND (v_search = '' OR 
       public.f_unaccent(lower(coalesce(p.display_name, ''))) LIKE '%' || v_search || '%' OR
       public.f_unaccent(lower(coalesce(p.first_name, ''))) LIKE '%' || v_search || '%' OR
       public.f_unaccent(lower(coalesce(p.last_name, ''))) LIKE '%' || v_search || '%' OR
       lower(coalesce(p.work_email, p.email, '')) LIKE '%' || v_search || '%')
    ORDER BY p.display_name
    LIMIT v_internal_limit
  ),
  external_contacts AS (
    SELECT 
      pc.id AS id,
      pc.id AS entity_id,
      'partner_contact'::text AS entity_type,
      pc.name AS display_name,
      pc.email AS email,
      NULL::text AS photo_url,
      NULL::text AS team_name,
      pco.name AS partner_company_name,
      2 AS priority
    FROM partner_contacts pc
    INNER JOIN partner_companies pco ON pco.id = pc.partner_company_id
    WHERE 
      pc.bu_id = p_bu_id
      AND pc.deleted_at IS NULL
      AND pc.status = 'active'
      AND (p_partner_company_id IS NULL OR pc.partner_company_id = p_partner_company_id)
      AND (v_search = '' OR 
           public.f_unaccent(lower(pc.name)) LIKE '%' || v_search || '%' OR
           lower(coalesce(pc.email, '')) LIKE '%' || v_search || '%')
    ORDER BY pc.name
    LIMIT v_external_limit
  )
  SELECT 
    r.id,
    r.entity_id,
    r.entity_type,
    r.display_name,
    r.email,
    r.photo_url,
    r.team_name,
    r.partner_company_name
  FROM (
    SELECT * FROM internal_users
    UNION ALL
    SELECT * FROM external_contacts
  ) r
  ORDER BY r.priority, r.display_name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_mention_candidates(uuid, uuid, text, integer) IS 
  'Search for mentionable users (internal + external). When partner_company_id is provided, ensures balanced results between internal and external contacts.';
