-- Fix 1: automation_incoming_tokens SELECT - restrict global scope to platform admins
DROP POLICY IF EXISTS "automation_incoming_tokens_select_v2" ON public.automation_incoming_tokens;
CREATE POLICY "automation_incoming_tokens_select_v2" ON public.automation_incoming_tokens
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN scope = 'global' THEN is_platform_admin(auth.uid())
      ELSE bu_id IS NOT NULL AND is_profile_bu_member(my_profile_id(), bu_id)
    END
  );

-- Fix 2: Remove legacy partner BU assoc policy (superseded by partner_bu_assoc_select_policy)
DROP POLICY IF EXISTS "Partner BU associations viewable by BU members" ON public.external_company_bu_associations;