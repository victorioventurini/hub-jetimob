CREATE POLICY "External users can view their associated BUs"
ON public.bu_units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.partner_contact_bu_associations pcba
    JOIN public.partner_contacts pc ON pc.id = pcba.partner_contact_id
    WHERE pcba.bu_id = bu_units.id
      AND pcba.is_active = true
      AND pcba.deleted_at IS NULL
      AND pc.user_id = auth.uid()
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
  )
);