-- Enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Create immutable wrapper for unaccent (required for index usage)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Create RPC function for accent-insensitive user search in mentions
CREATE OR REPLACE FUNCTION public.search_bu_users_for_mention(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  photo_url text,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.user_id,
    v.display_name,
    v.email,
    v.photo_url,
    v.team_name
  FROM v_bu_active_profiles v
  WHERE v.bu_id = p_bu_id
    AND (
      p_search_term IS NULL 
      OR p_search_term = ''
      OR public.f_unaccent(lower(v.display_name)) ILIKE '%' || public.f_unaccent(lower(p_search_term)) || '%'
    )
  ORDER BY v.display_name
  LIMIT p_limit;
$$;