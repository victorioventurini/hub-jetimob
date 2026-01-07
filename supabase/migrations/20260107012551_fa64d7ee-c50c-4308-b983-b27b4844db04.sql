-- Desabilitar triggers de enforce_bu_scope específicos
ALTER TABLE public.ticket_subcategories DISABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;
ALTER TABLE public.partner_contact_capabilities DISABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;

-- 1. Inserir subcategorias únicas na categoria Jurídico
INSERT INTO public.ticket_subcategories (bu_id, category_id, name, status)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Empresarial - Consultoria Geral', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Tributário - Geral', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Civil - Responsabilidade Civil', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Consumidor - Responsabilidade', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Civil - Cobrança e Inadimplência', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Tributário - Execuções', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Civil - Ações Cíveis Gerais', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Civil - Execuções', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Trabalhista - Reclamação Trabalhista', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Trabalhista - Acordos e Rescisões', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Imobiliário - Geral', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Compliance - Auditoria', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Compliance - Denúncia', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Trabalhista - Passivo Trabalhista', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Trabalhista - Consultivo Trabalhista', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Contratos - Elaboração', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Contratos - Revisão', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'Contratos - Rescisão', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'LGPD - Consultoria', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'f14e0f87-4774-445c-951d-58856c1410e7', 'LGPD - Incidente de Dados', 'active')
ON CONFLICT DO NOTHING;

-- 2. Inserir contatos vinculados à empresa Ferrigolo
INSERT INTO public.partner_contacts (bu_id, partner_company_id, name, email, phone, status)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Bianca Sacchis Ferrigolo', 'bianca@ferrigoloadvogados.com.br', '55 (55) 99943-4774', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Andressa Carvalho Martins', 'andressac@ferrigoloadvogados.com.br', '55 (55) 98453-5758', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Andressa Giuliani Fontana', 'andressaf@ferrigoloadvogados.com.br', '55 (55) 99659-9007', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Flávia Leães Cortelini', 'flavia@ferrigoloadvogados.com.br', '55 (55) 99602-1767', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Laura Marchezan Rodrigues', 'laura.ferrigoloadvogados@gmail.com', '55 (55) 99941-5043', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Liéli Benites de Oliveira', 'lieli@ferrigoloadvogados.com.br', '55 (55) 99948-3079', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Luana dos Santos Sarmento', 'luana@ferrigoloadvogados.com.br', '55 (55) 99200-8024', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Luciana Guimarães Félix Maia', 'luciana@ferrigoloadvogados.com.br', '55 (55) 99218-8010', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Mariana Papaleo Montardo', 'mariana@ferrigoloadvogados.com.br', '55 (55) 99263-6755', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Thales Henrique da Rosa', 'thales@ferrigoloadvogados.com.br', '55 (55) 99192-3699', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Jéssica da Rosa Martins', 'jessica@ferrigoloadvogados.com.br', '55 (55) 99908-2097', 'active'),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'Gabriel Bassan dos Santos', 'lgpd@ferrigoloadvogados.com.br', '55 (55) 99911-1512', 'active')
ON CONFLICT DO NOTHING;

-- Reabilitar triggers
ALTER TABLE public.ticket_subcategories ENABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;
ALTER TABLE public.partner_contact_capabilities ENABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;