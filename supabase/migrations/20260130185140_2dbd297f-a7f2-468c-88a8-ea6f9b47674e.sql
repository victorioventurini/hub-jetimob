-- Migration: Atualizar função search_mention_candidates para usar p_external_company_id

-- 1. Dropar a função existente
DROP FUNCTION IF EXISTS public.search_mention_candidates(uuid, uuid, text, integer);

-- 2. Recriar com o novo parâmetro
CREATE OR REPLACE FUNCTION public.search_mention_candidates(
  p_bu_id uuid,
  p_external_company_id uuid DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  entity_type text,
  display_name text,
  email text,
  photo_url text
)
LANGUAGE plpgsql
SECURITY INVOKER
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
    p.photo_url
  FROM profiles p
  JOIN bu_user_memberships bum ON bum.profile_id = p.id
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
  
  -- External contacts (from partner company or all if null)
  SELECT 
    pc.id,
    pc.id AS entity_id,
    'partner_contact'::text AS entity_type,
    pc.name AS display_name,
    pc.email,
    NULL::text AS photo_url
  FROM partner_contacts pc
  JOIN partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
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

COMMENT ON FUNCTION public.search_mention_candidates(uuid, uuid, text, integer) IS 'Busca candidatos para menção (usuários internos e contatos externos). Parâmetro renomeado de p_partner_company_id para p_external_company_id em v2.76.0';