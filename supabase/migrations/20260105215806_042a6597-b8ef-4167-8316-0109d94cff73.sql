-- Harden SECURITY DEFINER functions by setting an explicit search_path.

CREATE OR REPLACE FUNCTION public.has_asset_permission(
  p_user_id uuid,
  p_bu_id uuid,
  p_roles public.asset_permission_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asset_permissions
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
      AND role = ANY(p_roles)
  )
  OR is_bu_admin(p_user_id, p_bu_id)
  OR is_platform_admin(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_gifts(
  p_user_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_asset_permission(
    p_user_id,
    p_bu_id,
    ARRAY['assets_admin', 'gifts_admin', 'gifts_manager']::asset_permission_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_inventory(
  p_user_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_asset_permission(
    p_user_id,
    p_bu_id,
    ARRAY['assets_admin', 'inventory_admin', 'inventory_manager']::asset_permission_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_keys(
  p_user_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_asset_permission(
    p_user_id,
    p_bu_id,
    ARRAY['assets_admin', 'keys_admin', 'keys_manager']::asset_permission_role[]
  );
$$;