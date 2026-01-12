-- ============================================
-- Add user_type filter to get_global_users_admin
-- ============================================

CREATE OR REPLACE FUNCTION get_global_users_admin(
  p_search TEXT DEFAULT NULL,
  p_bu_id UUID DEFAULT NULL,
  p_onboarding_status TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  display_name TEXT,
  work_email TEXT,
  user_type TEXT,
  onboarding_completed BOOLEAN,
  primary_bu_id UUID,
  primary_bu_name TEXT,
  last_sign_in_at TIMESTAMPTZ,
  global_role TEXT,
  bu_accesses JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.work_email,
    p.user_type,
    p.onboarding_completed,
    p.bu_id,
    bu.name,
    u.last_sign_in_at,
    ur.role::text,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'bu_id', m.bu_id,
        'bu_name', bu2.name,
        'role_in_bu', m.role_in_bu,
        'is_default', m.is_default
      ) ORDER BY bu2.name)
      FROM bu_user_memberships m
      JOIN bu_units bu2 ON m.bu_id = bu2.id
      WHERE m.profile_id = p.id AND m.deleted_at IS NULL),
      '[]'::jsonb
    )
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN bu_units bu ON p.bu_id = bu.id
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.deleted_at IS NULL
    AND is_platform_admin(auth.uid())
    AND (p_search IS NULL OR p.display_name ILIKE '%' || p_search || '%' OR p.work_email ILIKE '%' || p_search || '%')
    AND (p_bu_id IS NULL OR EXISTS (
      SELECT 1 FROM bu_user_memberships m2 
      WHERE m2.profile_id = p.id 
        AND m2.bu_id = p_bu_id 
        AND m2.deleted_at IS NULL
    ))
    AND (
      p_onboarding_status IS NULL 
      OR (p_onboarding_status = 'completed' AND p.onboarding_completed = true)
      OR (p_onboarding_status = 'pending' AND (p.onboarding_completed = false OR p.onboarding_completed IS NULL))
    )
    AND (p_user_type IS NULL OR p.user_type = p_user_type)
  ORDER BY p.display_name NULLS LAST;
$$;