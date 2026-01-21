
-- Fix 3 critical RLS policy issues identified in security audit
-- 1. ticket_internal_routing_rules: has_permission(auth.uid()) → my_profile_id()
-- 2. tickets: is_bu_admin(auth.uid()) → my_profile_id()  
-- 3. partner_contacts: fix self-referencing bug pcba.partner_contact_id = pcba.id

-- =============================================================================
-- 1. FIX ticket_internal_routing_rules policies
-- =============================================================================

DROP POLICY IF EXISTS "Users with permission can update internal routing rules"
  ON public.ticket_internal_routing_rules;

DROP POLICY IF EXISTS "Users with permission can delete internal routing rules"
  ON public.ticket_internal_routing_rules;

DROP POLICY IF EXISTS "Users with permission can create internal routing rules"
  ON public.ticket_internal_routing_rules;

-- Note: These are redundant with *_v2 policies, but let's fix them to be safe
CREATE POLICY "Users with permission can update internal routing rules"
  ON public.ticket_internal_routing_rules
  FOR UPDATE
  TO public
  USING (
    bu_id = current_bu_id() 
    AND has_permission(my_profile_id(), current_bu_id(), 'tickets.internal_routing.manage'::text)
  );

CREATE POLICY "Users with permission can delete internal routing rules"
  ON public.ticket_internal_routing_rules
  FOR DELETE
  TO public
  USING (
    bu_id = current_bu_id() 
    AND has_permission(my_profile_id(), current_bu_id(), 'tickets.internal_routing.manage'::text)
  );

CREATE POLICY "Users with permission can create internal routing rules"
  ON public.ticket_internal_routing_rules
  FOR INSERT
  TO public
  WITH CHECK (
    bu_id = current_bu_id() 
    AND has_permission(my_profile_id(), current_bu_id(), 'tickets.internal_routing.manage'::text)
  );

-- =============================================================================
-- 2. FIX tickets_select_policy (is_bu_admin receives auth.uid() but expects profile_id)
-- =============================================================================

DROP POLICY IF EXISTS "tickets_select_policy"
  ON public.tickets;

CREATE POLICY "tickets_select_policy"
  ON public.tickets
  FOR SELECT
  TO public
  USING (
    deleted_at IS NULL 
    AND is_current_bu(bu_id) 
    AND (
      is_bu_admin(my_profile_id(), bu_id) 
      OR is_platform_admin(auth.uid())  -- this one correctly uses auth.uid()
      OR can_view_ticket(my_profile_id(), id)
    )
  );

-- =============================================================================
-- 3. FIX partner_contacts update policy (self-referencing bug)
-- =============================================================================

DROP POLICY IF EXISTS "Users can update partner contacts with BU association"
  ON public.partner_contacts;

CREATE POLICY "Users can update partner contacts with BU association"
  ON public.partner_contacts
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_contact_bu_associations pcba
      WHERE pcba.partner_contact_id = partner_contacts.id  -- FIX: was pcba.id
        AND pcba.bu_id = current_bu_id()
        AND pcba.deleted_at IS NULL
    )
    OR bu_id = current_bu_id()
  );
