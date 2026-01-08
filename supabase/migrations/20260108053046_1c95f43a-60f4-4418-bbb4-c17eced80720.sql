-- =============================================
-- RLS Policies Part 5: Partner Module
-- =============================================

-- partner_companies
CREATE POLICY "partner_companies_select" ON public.partner_companies
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "partner_companies_admin" ON public.partner_companies
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- partner_contacts
CREATE POLICY "partner_contacts_select" ON public.partner_contacts
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "partner_contacts_admin" ON public.partner_contacts
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- partner_contact_capabilities
CREATE POLICY "partner_contact_capabilities_select" ON public.partner_contact_capabilities
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "partner_contact_capabilities_admin" ON public.partner_contact_capabilities
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- partner_service_mappings
CREATE POLICY "partner_service_mappings_select" ON public.partner_service_mappings
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "partner_service_mappings_admin" ON public.partner_service_mappings
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);