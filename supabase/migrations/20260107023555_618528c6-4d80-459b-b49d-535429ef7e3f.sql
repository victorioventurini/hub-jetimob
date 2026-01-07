-- Temporarily disable user-defined BU scope enforcement triggers for data clone
ALTER TABLE ticket_categories DISABLE TRIGGER trg_enforce_bu_scope_ticket_categories;
ALTER TABLE ticket_subcategories DISABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;

-- 1. Create Jurídico category for Jet Experience
INSERT INTO ticket_categories (bu_id, name, description, scope, status)
VALUES ('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Jurídico', 'Serviços jurídicos', 'external', 'active');

-- 2. Create subcategories for Jet Experience
WITH new_cat AS (
  SELECT id FROM ticket_categories 
  WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND name = 'Jurídico'
)
INSERT INTO ticket_subcategories (category_id, bu_id, name, status)
SELECT 
  (SELECT id FROM new_cat),
  'f3d2d8a5-2143-42f0-8738-9b51fb74b49f',
  ts.name,
  'active'
FROM ticket_subcategories ts
WHERE ts.category_id = 'f14e0f87-4774-445c-951d-58856c1410e7' AND ts.deleted_at IS NULL;

-- 3. Create partner company for Jet Experience
INSERT INTO partner_companies (bu_id, name, allowed_domains, status)
VALUES ('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Ferrigolo Advogados Associados', ARRAY['ferrigoloadvogados.com.br'], 'active');

-- 4. Clone contacts (deduplicated by email)
WITH new_company AS (
  SELECT id FROM partner_companies 
  WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND name = 'Ferrigolo Advogados Associados'
)
INSERT INTO partner_contacts (bu_id, partner_company_id, name, email, phone, status)
SELECT DISTINCT ON (email)
  'f3d2d8a5-2143-42f0-8738-9b51fb74b49f',
  (SELECT id FROM new_company),
  pc.name,
  pc.email,
  pc.phone,
  pc.status
FROM partner_contacts pc
WHERE pc.partner_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a' AND pc.deleted_at IS NULL
ORDER BY email, pc.created_at;

-- 5. Create partner service mapping (generalista for Jurídico)
WITH new_company AS (
  SELECT id FROM partner_companies 
  WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND name = 'Ferrigolo Advogados Associados'
),
new_cat AS (
  SELECT id FROM ticket_categories 
  WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND name = 'Jurídico'
)
INSERT INTO partner_service_mappings (bu_id, partner_company_id, category_id, subcategory_id, status)
VALUES (
  'f3d2d8a5-2143-42f0-8738-9b51fb74b49f',
  (SELECT id FROM new_company),
  (SELECT id FROM new_cat),
  NULL,
  'active'
);

-- Re-enable triggers
ALTER TABLE ticket_categories ENABLE TRIGGER trg_enforce_bu_scope_ticket_categories;
ALTER TABLE ticket_subcategories ENABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;