
-- Wave 5 Cleanup: Remove permissive legacy policies from squad_memberships
-- These old policies bypass BU scope and are security risks

DROP POLICY IF EXISTS "squad_memberships_select" ON public.squad_memberships;
DROP POLICY IF EXISTS "squad_memberships_admin" ON public.squad_memberships;

-- Recreate SELECT policy with proper is_current_bu check for full BU enforcement
DROP POLICY IF EXISTS "BU members can view squad memberships" ON public.squad_memberships;
CREATE POLICY "BU members can view squad memberships"
  ON public.squad_memberships FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_current_bu(bu_id)
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );
