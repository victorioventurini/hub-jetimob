-- Migration: Atualizar funções SQL para usar p_external_company_id
-- As colunas já foram renomeadas, mas os parâmetros das funções ainda usam o nome antigo

-- 1. Recriar get_partner_categories com novo parâmetro
DROP FUNCTION IF EXISTS public.get_partner_categories(uuid);

CREATE OR REPLACE FUNCTION public.get_partner_categories(p_external_company_id uuid)
RETURNS TABLE(
  category_id uuid,
  category_name text,
  is_generalist boolean,
  subcategory_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    tc.id AS category_id,
    tc.name AS category_name,
    bool_or(psm.subcategory_id IS NULL) AS is_generalist,
    count(psm.subcategory_id) AS subcategory_count
  FROM partner_service_mappings psm
  JOIN ticket_categories tc ON tc.id = psm.category_id
  WHERE psm.external_company_id = p_external_company_id
    AND psm.status = 'active'
    AND psm.deleted_at IS NULL
    AND tc.deleted_at IS NULL
  GROUP BY tc.id, tc.name
  ORDER BY tc.name;
$$;

COMMENT ON FUNCTION public.get_partner_categories(uuid) IS 'Busca categorias atendidas por uma empresa parceira. Parâmetro renomeado de p_partner_company_id para p_external_company_id em v2.76.0';

-- 2. Recriar get_partner_subcategories com novo parâmetro
DROP FUNCTION IF EXISTS public.get_partner_subcategories(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_partner_subcategories(p_external_company_id uuid, p_category_id uuid)
RETURNS TABLE(
  subcategory_id uuid,
  subcategory_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    ts.id AS subcategory_id,
    ts.name AS subcategory_name
  FROM partner_service_mappings psm
  JOIN ticket_subcategories ts ON ts.id = psm.subcategory_id
  WHERE psm.external_company_id = p_external_company_id
    AND psm.category_id = p_category_id
    AND psm.status = 'active'
    AND psm.deleted_at IS NULL
    AND ts.deleted_at IS NULL
  ORDER BY ts.name;
$$;

COMMENT ON FUNCTION public.get_partner_subcategories(uuid, uuid) IS 'Busca subcategorias atendidas por uma empresa parceira para uma categoria. Parâmetros atualizados em v2.76.0';