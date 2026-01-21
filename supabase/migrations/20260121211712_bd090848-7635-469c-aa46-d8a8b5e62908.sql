-- Fix infinite recursion between partner_contacts and partner_contact_bu_associations RLS
-- Root cause: policies referenced each other; plus a broken join condition.

-- 1) partner_contact_bu_associations: avoid querying partner_contacts inside RLS (break recursion)
DROP POLICY IF EXISTS "External users can view their own BU associations"
  ON public.partner_contact_bu_associations;

CREATE POLICY "External users can view their own BU associations"
  ON public.partner_contact_bu_associations
  FOR SELECT
  TO authenticated
  USING (
    partner_contact_id = public.get_user_partner_contact_id(auth.uid())
  );

-- 2) partner_contacts: fix BU association policy join condition (and keep behavior)
DROP POLICY IF EXISTS "Users can view partner contacts with BU association"
  ON public.partner_contacts;

CREATE POLICY "Users can view partner contacts with BU association"
  ON public.partner_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_contact_bu_associations pcba
      WHERE pcba.partner_contact_id = public.partner_contacts.id
        AND pcba.bu_id = public.current_bu_id()
        AND pcba.is_active = true
        AND pcba.deleted_at IS NULL
    )
    OR public.partner_contacts.bu_id = public.current_bu_id() -- backward compat during transition
  );
