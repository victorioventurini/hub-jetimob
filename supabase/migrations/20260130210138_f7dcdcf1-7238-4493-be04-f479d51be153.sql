-- Drop all versions of search_mention_candidates and recreate clean version
DROP FUNCTION IF EXISTS search_mention_candidates(uuid, text, uuid, integer);

CREATE FUNCTION search_mention_candidates(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL,
  p_external_company_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  entity_type text,
  display_name text,
  email text,
  photo_url text,
  team_name text,
  external_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Internal users from BU
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
    AND (
      p_search_term IS NULL 
      OR p.display_name ILIKE '%' || p_search_term || '%'
      OR p.work_email ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- External contacts (from external company or all if null)
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