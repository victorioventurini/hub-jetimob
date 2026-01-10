-- Harden mention user search RPC: enforce BU membership and remove SECURITY DEFINER.

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
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_limit integer;
BEGIN
  v_profile_id := public.my_profile_id();

  IF NOT public.is_profile_bu_member(v_profile_id, p_bu_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));

  RETURN QUERY
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
  LIMIT v_limit;
END;
$$;

-- Ensure function runs with invoker privileges (prevents bypassing RLS)
ALTER FUNCTION public.search_bu_users_for_mention(uuid, text, integer) SECURITY INVOKER;