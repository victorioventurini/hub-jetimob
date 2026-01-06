-- Recriar view com SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.v_partner_services;

CREATE VIEW public.v_partner_services 
WITH (security_invoker = true)
AS
SELECT 
  psm.id,
  psm.bu_id,
  psm.partner_company_id,
  pc.name AS partner_company_name,
  psm.category_id,
  tc.name AS category_name,
  tc.scope AS category_scope,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  psm.subcategory_id IS NULL AS is_generalist,
  psm.status,
  psm.notes,
  psm.created_at,
  psm.updated_at
FROM public.partner_service_mappings psm
JOIN public.partner_companies pc ON pc.id = psm.partner_company_id AND pc.deleted_at IS NULL
JOIN public.ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
LEFT JOIN public.ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
WHERE psm.deleted_at IS NULL;