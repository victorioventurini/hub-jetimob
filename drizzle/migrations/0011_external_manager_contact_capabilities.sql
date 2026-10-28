CREATE OR REPLACE FUNCTION public.my_managed_partner_company(p_bu_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pc.external_company_id
  FROM partner_contacts pc
  WHERE pc.user_id = auth.uid()
    AND pc.deleted_at IS NULL
    AND pc.status = 'active'
    AND pc.can_view_company_tickets = true
    AND (pc.bu_id = p_bu_id OR EXISTS (
      SELECT 1 FROM partner_contact_bu_associations a
      WHERE a.partner_contact_id = pc.id AND a.bu_id = p_bu_id
        AND a.is_active AND a.deleted_at IS NULL))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.my_managed_partner_company(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_partner_contact_capabilities(p_contact_id uuid, p_bu_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_permission(public.my_profile_id(), p_bu_id, 'partners.contact.update:bu')
    OR EXISTS (
      SELECT 1 FROM partner_contacts t
      WHERE t.id = p_contact_id AND t.deleted_at IS NULL
        AND t.external_company_id = public.my_managed_partner_company(p_bu_id)
    )
$$;
GRANT EXECUTE ON FUNCTION public.can_manage_partner_contact_capabilities(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_managed_company_categories(p_bu_id uuid)
RETURNS TABLE(category_id uuid, category_name text, subcategory_id uuid, subcategory_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, s.id, s.name
  FROM partner_service_mappings m
  JOIN ticket_categories c ON c.id = m.category_id AND c.deleted_at IS NULL
  LEFT JOIN ticket_subcategories s ON s.category_id = c.id AND s.deleted_at IS NULL
    AND (m.subcategory_id IS NULL OR s.id = m.subcategory_id)
  WHERE m.bu_id = p_bu_id AND m.deleted_at IS NULL AND m.status = 'active'
    AND m.external_company_id = public.my_managed_partner_company(p_bu_id)
  ORDER BY c.name, s.name
$$;
GRANT EXECUTE ON FUNCTION public.list_managed_company_categories(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_external_capability_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_permission(public.my_profile_id(), NEW.bu_id, 'partners.contact.update:bu') THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM partner_service_mappings m
    WHERE m.bu_id = NEW.bu_id AND m.external_company_id = NEW.external_company_id
      AND m.category_id = NEW.category_id AND m.deleted_at IS NULL AND m.status = 'active'
      AND (m.subcategory_id IS NULL OR m.subcategory_id = NEW.subcategory_id)
  ) THEN
    RAISE EXCEPTION 'Categoria não atendida pela empresa nesta unidade' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_external_capability_scope ON public.partner_contact_capabilities;
CREATE TRIGGER trg_validate_external_capability_scope
BEFORE INSERT OR UPDATE ON public.partner_contact_capabilities
FOR EACH ROW EXECUTE FUNCTION public.validate_external_capability_scope();

DROP POLICY IF EXISTS partner_contact_capabilities_insert_v2 ON public.partner_contact_capabilities;
CREATE POLICY partner_contact_capabilities_insert_v2 ON public.partner_contact_capabilities
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_partner_contact_capabilities(contact_id, bu_id));
DROP POLICY IF EXISTS partner_contact_capabilities_update_v2 ON public.partner_contact_capabilities;
CREATE POLICY partner_contact_capabilities_update_v2 ON public.partner_contact_capabilities
  FOR UPDATE TO authenticated USING (public.can_manage_partner_contact_capabilities(contact_id, bu_id));
DROP POLICY IF EXISTS partner_contact_capabilities_delete_v2 ON public.partner_contact_capabilities;
CREATE POLICY partner_contact_capabilities_delete_v2 ON public.partner_contact_capabilities
  FOR DELETE TO authenticated USING (public.can_manage_partner_contact_capabilities(contact_id, bu_id));