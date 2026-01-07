-- Atualizar RPC get_partner_categories para incluir capacidades dos contatos
CREATE OR REPLACE FUNCTION public.get_partner_categories(p_partner_company_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  is_generalist BOOLEAN,
  subcategory_count BIGINT
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    combined.category_id,
    tc.name::TEXT AS category_name,
    -- É generalista se existe em partner_service_mappings com subcategory_id NULL
    -- OU se existe em partner_contact_capabilities com subcategory_id NULL
    EXISTS (
      SELECT 1 FROM public.partner_service_mappings psm2
      WHERE psm2.partner_company_id = p_partner_company_id
        AND psm2.category_id = combined.category_id
        AND psm2.subcategory_id IS NULL
        AND psm2.status = 'active'
        AND psm2.deleted_at IS NULL
    ) OR EXISTS (
      SELECT 1 FROM public.partner_contact_capabilities pcc2
      WHERE pcc2.partner_company_id = p_partner_company_id
        AND pcc2.category_id = combined.category_id
        AND pcc2.subcategory_id IS NULL
        AND pcc2.is_active = true
        AND pcc2.deleted_at IS NULL
    ) AS is_generalist,
    -- Conta subcategorias de ambas as fontes
    (
      SELECT COUNT(DISTINCT sub.subcategory_id)
      FROM (
        SELECT psm3.subcategory_id
        FROM public.partner_service_mappings psm3
        WHERE psm3.partner_company_id = p_partner_company_id
          AND psm3.category_id = combined.category_id
          AND psm3.subcategory_id IS NOT NULL
          AND psm3.status = 'active'
          AND psm3.deleted_at IS NULL
        UNION
        SELECT pcc3.subcategory_id
        FROM public.partner_contact_capabilities pcc3
        WHERE pcc3.partner_company_id = p_partner_company_id
          AND pcc3.category_id = combined.category_id
          AND pcc3.subcategory_id IS NOT NULL
          AND pcc3.is_active = true
          AND pcc3.deleted_at IS NULL
      ) sub
    ) AS subcategory_count
  FROM (
    -- Unir categorias de partner_service_mappings e partner_contact_capabilities
    SELECT psm.category_id
    FROM public.partner_service_mappings psm
    WHERE psm.partner_company_id = p_partner_company_id
      AND psm.status = 'active'
      AND psm.deleted_at IS NULL
    UNION
    SELECT pcc.category_id
    FROM public.partner_contact_capabilities pcc
    WHERE pcc.partner_company_id = p_partner_company_id
      AND pcc.is_active = true
      AND pcc.deleted_at IS NULL
  ) combined
  JOIN public.ticket_categories tc ON tc.id = combined.category_id AND tc.deleted_at IS NULL
  ORDER BY tc.name;
END;
$$;

-- Atualizar RPC get_partner_subcategories para incluir capacidades dos contatos
CREATE OR REPLACE FUNCTION public.get_partner_subcategories(p_partner_company_id UUID, p_category_id UUID)
RETURNS TABLE (
  subcategory_id UUID,
  subcategory_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    combined.subcategory_id,
    ts.name::TEXT AS subcategory_name
  FROM (
    -- Subcategorias de partner_service_mappings
    SELECT psm.subcategory_id
    FROM public.partner_service_mappings psm
    WHERE psm.partner_company_id = p_partner_company_id
      AND psm.category_id = p_category_id
      AND psm.subcategory_id IS NOT NULL
      AND psm.status = 'active'
      AND psm.deleted_at IS NULL
    UNION
    -- Subcategorias de partner_contact_capabilities
    SELECT pcc.subcategory_id
    FROM public.partner_contact_capabilities pcc
    WHERE pcc.partner_company_id = p_partner_company_id
      AND pcc.category_id = p_category_id
      AND pcc.subcategory_id IS NOT NULL
      AND pcc.is_active = true
      AND pcc.deleted_at IS NULL
  ) combined
  JOIN public.ticket_subcategories ts ON ts.id = combined.subcategory_id AND ts.deleted_at IS NULL
  ORDER BY ts.name;
END;
$$;