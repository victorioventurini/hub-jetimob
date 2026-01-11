-- Fix partner_contacts SELECT policy: change from public to authenticated
-- The policy uses my_profile_id() which requires auth.uid()

DROP POLICY IF EXISTS partner_contacts_select ON public.partner_contacts;

CREATE POLICY "partner_contacts_select" 
ON public.partner_contacts 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- Also fix partner_companies SELECT policy (same issue)
DROP POLICY IF EXISTS partner_companies_select ON public.partner_companies;

CREATE POLICY "partner_companies_select" 
ON public.partner_companies 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));