-- Fix asset_inventory RLS to respect asset_permissions table
-- The current policy only checks user_roles and bu_user_memberships
-- But asset management roles are stored in asset_permissions table

-- Create helper function to check if user can manage inventory via asset_permissions
CREATE OR REPLACE FUNCTION public.can_manage_asset_inventory(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.asset_permissions
    WHERE user_id = (SELECT id FROM public.profiles WHERE user_id = p_user_id)
      AND bu_id = p_bu_id
      AND role IN ('assets_admin', 'inventory_admin', 'inventory_manager')
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "asset_inventory_admin" ON public.asset_inventory;
DROP POLICY IF EXISTS "asset_inventory_select" ON public.asset_inventory;

-- Recreate SELECT policy (any BU member can view)
CREATE POLICY "asset_inventory_select" ON public.asset_inventory
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

-- Recreate admin policy with asset_permissions check
CREATE POLICY "asset_inventory_admin" ON public.asset_inventory
FOR ALL TO authenticated USING (
  -- Global admins
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR
  -- BU admins
  public.is_bu_admin(auth.uid(), bu_id) OR
  -- Users with asset module permissions
  public.can_manage_asset_inventory(auth.uid(), bu_id)
);