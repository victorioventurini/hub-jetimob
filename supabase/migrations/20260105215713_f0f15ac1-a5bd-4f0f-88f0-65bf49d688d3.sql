-- Fix legacy role value 'ceo' used in authorization helpers.
-- The enum public.app_role no longer includes 'ceo' (it was replaced by 'super_admin').

CREATE OR REPLACE FUNCTION public.is_bu_admin(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bu_user_memberships
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
      AND role_in_bu IN ('admin', 'super_admin')
  )
$$;