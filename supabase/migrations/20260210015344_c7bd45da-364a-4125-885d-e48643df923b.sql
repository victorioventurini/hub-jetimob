DROP FUNCTION IF EXISTS public.get_bu_users_by_membership(uuid, text, uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_bu_users_by_membership(
  p_bu_id uuid,
  p_search text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  work_email text,
  photo_url text,
  city text,
  state text,
  work_mode text,
  employment_status text,
  job_title_id uuid,
  job_title_name text,
  team_id uuid,
  team_name text,
  manager_user_id uuid,
  role_in_bu text,
  is_default_bu boolean,
  total_count bigint
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  WITH filtered_members AS (
    SELECT 
      p.id as profile_id,
      p.user_id,
      p.first_name,
      p.last_name,
      p.display_name,
      p.work_email,
      p.photo_url,
      p.city,
      p.state,
      p.work_mode::text,
      p.employment_status::text,
      p.job_title_id,
      jt.name as job_title_name,
      p.team_id,
      t.name as team_name,
      p.manager_user_id,
      m.role_in_bu::text,
      m.is_default,
      COUNT(*) OVER() as total_count
    FROM bu_user_memberships m
    JOIN profiles p ON m.profile_id = p.id
    LEFT JOIN job_titles jt ON p.job_title_id = jt.id
    LEFT JOIN teams t ON p.team_id = t.id AND t.bu_id = p_bu_id
    WHERE m.bu_id = p_bu_id
      AND m.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (
        p_search IS NULL
        OR p.display_name ILIKE '%' || p_search || '%'
        OR p.work_email ILIKE '%' || p_search || '%'
        OR COALESCE(jt.name, '') ILIKE '%' || p_search || '%'
      )
      AND (p_team_id IS NULL OR p.team_id = p_team_id)
      AND (
        p_status = 'all'
        OR (p_status = 'active' AND p.employment_status::text != 'terminated')
        OR (p_status != 'all' AND p_status != 'active' AND p.employment_status::text = p_status)
      )
    ORDER BY p.display_name NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT * FROM filtered_members
$$;