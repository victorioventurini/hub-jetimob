
-- Corrigir security definer view adicionando security_invoker
DROP VIEW IF EXISTS v_partner_services_by_bu;

CREATE VIEW v_partner_services_by_bu 
WITH (security_invoker = true)
AS
SELECT 
  psm.id,
  pba.bu_id,
  psm.partner_company_id,
  pc.name AS partner_company_name,
  pc.person_type,
  pc.document,
  pc.document_type,
  psm.category_id,
  tc.name AS category_name,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  psm.status
FROM partner_service_mappings psm
JOIN partner_companies pc ON pc.id = psm.partner_company_id AND pc.deleted_at IS NULL
JOIN partner_company_bu_associations pba ON pba.partner_company_id = pc.id 
  AND pba.is_active = true 
  AND pba.deleted_at IS NULL
JOIN ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
LEFT JOIN ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
WHERE psm.deleted_at IS NULL;
