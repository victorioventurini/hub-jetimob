-- Atualizar view v_partner_services para usar novos nomes de coluna
DROP VIEW IF EXISTS v_partner_services;

CREATE OR REPLACE VIEW v_partner_services AS
SELECT 
  psm.id,
  psm.bu_id,
  psm.external_company_id,
  ec.name AS external_company_name,
  psm.category_id,
  tc.name AS category_name,
  tc.scope AS category_scope,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  CASE WHEN psm.subcategory_id IS NULL THEN true ELSE false END AS is_generalist,
  psm.status,
  psm.notes,
  psm.created_at,
  psm.updated_at
FROM partner_service_mappings psm
JOIN external_companies ec ON ec.id = psm.external_company_id
JOIN ticket_categories tc ON tc.id = psm.category_id
LEFT JOIN ticket_subcategories ts ON ts.id = psm.subcategory_id
WHERE psm.deleted_at IS NULL;