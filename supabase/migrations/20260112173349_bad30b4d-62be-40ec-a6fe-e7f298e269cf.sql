
-- DROP da versão antiga sem p_user_type para evitar ambiguidade
DROP FUNCTION IF EXISTS public.get_global_users_admin(text, uuid, text);

-- Recriar APENAS a versão correta com p_user_type
CREATE OR REPLACE FUNCTION public.get_global_users_admin(
  p_search text DEFAULT NULL,
  p_bu_id uuid DEFAULT NULL,
  p_onboarding_status text DEFAULT NULL,
  p_user_type text DEFAULT NULL
)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  display_name text,
  work_email text,
  user_type text,
  onboarding_completed boolean,
  primary_bu_id uuid,
  primary_bu_name text,
  last_sign_in_at timestamp with time zone,
  global_role text,
  bu_accesses jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
