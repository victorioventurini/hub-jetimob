
BEGIN;

-- Suspende temporariamente as triggers de validação de contexto BU para permitir
-- que a operação administrativa rode sem auth.uid() (migration runtime).
ALTER TABLE public.ticket_categories DISABLE TRIGGER trg_enforce_bu_scope_ticket_categories;
ALTER TABLE public.ticket_subcategories DISABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;
ALTER TABLE public.partner_contact_capabilities DISABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;

-- Etapa 1: criar categoria "Jurídico" na BU Victorio Venturini
INSERT INTO public.ticket_categories (bu_id, name, scope, status)
VALUES ('2eeeb494-178b-4a6d-96ee-d103fda448a0', 'Jurídico', 'external', 'active');

-- Etapa 2: replicar as 21 subcategorias preservando nomes e mensagem inicial
INSERT INTO public.ticket_subcategories (bu_id, category_id, name, status, default_initial_message)
SELECT
  '2eeeb494-178b-4a6d-96ee-d103fda448a0' AS bu_id,
  (SELECT id FROM public.ticket_categories
     WHERE bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
       AND name = 'Jurídico'
       AND deleted_at IS NULL) AS category_id,
  s.name,
  s.status,
  s.default_initial_message
FROM public.ticket_subcategories s
WHERE s.category_id = 'f14e0f87-4774-445c-951d-58856c1410e7'
  AND s.deleted_at IS NULL;

-- Etapa 3: vincular os 12 contatos ativos da Ferrigolo à BU Victorio Venturini
INSERT INTO public.partner_contact_bu_associations
  (partner_contact_id, bu_id, is_active, notes)
SELECT
  pc.id,
  '2eeeb494-178b-4a6d-96ee-d103fda448a0',
  true,
  'Habilitação manual — Ferrigolo Advogados Associados na BU Victorio Venturini'
FROM public.partner_contacts pc
WHERE pc.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND pc.status = 'active'
  AND pc.deleted_at IS NULL;

-- Etapa 4: replicar as 35 capacidades remapeando subcategoria pelo NOME
INSERT INTO public.partner_contact_capabilities
  (bu_id, external_company_id, contact_id, category_id, subcategory_id, is_active)
SELECT
  '2eeeb494-178b-4a6d-96ee-d103fda448a0' AS bu_id,
  pcc.external_company_id,
  pcc.contact_id,
  new_cat.id AS category_id,
  new_sub.id AS subcategory_id,
  true
FROM public.partner_contact_capabilities pcc
JOIN public.ticket_subcategories old_sub
  ON old_sub.id = pcc.subcategory_id
JOIN public.ticket_categories new_cat
  ON new_cat.bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
 AND new_cat.name = 'Jurídico'
 AND new_cat.deleted_at IS NULL
JOIN public.ticket_subcategories new_sub
  ON new_sub.category_id = new_cat.id
 AND new_sub.name = old_sub.name
 AND new_sub.deleted_at IS NULL
WHERE pcc.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND pcc.bu_id = 'a0000000-0000-0000-0000-000000000001'
  AND pcc.category_id = 'f14e0f87-4774-445c-951d-58856c1410e7'
  AND pcc.is_active = true
  AND pcc.deleted_at IS NULL;

-- Reabilita as triggers — fundamentais para o multi-tenancy
ALTER TABLE public.ticket_categories ENABLE TRIGGER trg_enforce_bu_scope_ticket_categories;
ALTER TABLE public.ticket_subcategories ENABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;
ALTER TABLE public.partner_contact_capabilities ENABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;

COMMIT;
