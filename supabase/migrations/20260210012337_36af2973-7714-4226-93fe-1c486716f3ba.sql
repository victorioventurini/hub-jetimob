CREATE OR REPLACE FUNCTION public.search_mention_candidates(
  p_bu_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_external_company_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  entity_id UUID,
  entity_type TEXT,
  display_name TEXT,
  email TEXT,
  photo_url TEXT,
  team_name TEXT,
  external_company_name TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Internal users from BU (exclude external profiles to avoid duplicates with partner_contacts)
  SELECT 
    p.id,
    p.id AS entity_id,
    'internal_user'::text AS entity_type,
    p.display_name,
    p.work_email AS email,
    p.photo_url,
    t.name AS team_name,
    NULL::text AS external_company_name
  FROM profiles p
  JOIN bu_user_memberships bum ON bum.profile_id = p.id
  LEFT JOIN teams t ON t.id = p.team_id
  WHERE bum.bu_id = p_bu_id
    AND bum.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.employment_status != 'terminated'
    AND p.user_type = 'internal'
    AND (
      p_search_term IS NULL 
      OR p.display_name ILIKE '%' || p_search_term || '%'
      OR p.work_email ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- External contacts
  SELECT 
    pc.id,
    pc.id AS entity_id,
    'partner_contact'::text AS entity_type,
    pc.name AS display_name,
    pc.email,
    NULL::text AS photo_url,
    NULL::text AS team_name,
    ec.name AS external_company_name
  FROM partner_contacts pc
  JOIN partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
  LEFT JOIN external_companies ec ON ec.id = pc.external_company_id
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
$$;