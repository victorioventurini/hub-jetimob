-- Allow external users to view their own partner_contacts record
-- This is needed during BU selection when no BU is selected yet
CREATE POLICY "Users can view their own partner contact record"
ON public.partner_contacts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow external users to view their own BU associations
-- This is needed during BU selection to determine which BUs they have access to
CREATE POLICY "External users can view their own BU associations"
ON public.partner_contact_bu_associations
FOR SELECT
TO authenticated
USING (
  partner_contact_id IN (
    SELECT id FROM public.partner_contacts 
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);