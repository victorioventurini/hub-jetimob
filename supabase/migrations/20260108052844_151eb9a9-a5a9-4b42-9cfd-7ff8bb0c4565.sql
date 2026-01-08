-- Create is_bu_member function
CREATE OR REPLACE FUNCTION public.is_bu_member(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bu_user_memberships
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
  )
$$;