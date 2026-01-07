-- Desabilitar trigger para inserção de capacidades
ALTER TABLE public.partner_contact_capabilities DISABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;

-- Inserir capacidades por contato baseado no CSV
-- Bianca Sacchis Ferrigolo: Empresarial - Consultoria Geral, Tributário - Geral
INSERT INTO public.partner_contact_capabilities (bu_id, partner_company_id, contact_id, category_id, subcategory_id, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'd63473a4-e79a-416d-9cb0-33de4e76fc5c', 'f14e0f87-4774-445c-951d-58856c1410e7', '1440c390-98d6-4cb5-bad1-b5b205b4c09b', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'd63473a4-e79a-416d-9cb0-33de4e76fc5c', 'f14e0f87-4774-445c-951d-58856c1410e7', '3793b829-a794-4d1e-a061-b6e7df1ee3ef', true),

-- Andressa Carvalho Martins: Civil - Responsabilidade Civil, Consumidor - Responsabilidade
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '56a583d3-0df0-4e97-a3e5-281cd9546a44', 'f14e0f87-4774-445c-951d-58856c1410e7', '2324fa1b-dd8c-4cca-83d5-c8e31df3822d', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '56a583d3-0df0-4e97-a3e5-281cd9546a44', 'f14e0f87-4774-445c-951d-58856c1410e7', '14dc6b89-0fb1-4908-a9c1-8dbe2896be9f', true),

-- Andressa Giuliani Fontana: Civil - Cobrança e Inadimplência, Tributário - Geral, Tributário - Execuções, Civil - Ações Cíveis Gerais
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1a3e8393-8790-4ca3-8c44-b7bae32177ae', 'f14e0f87-4774-445c-951d-58856c1410e7', '9e529169-2586-43ad-b3e4-ff6c66b83169', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1a3e8393-8790-4ca3-8c44-b7bae32177ae', 'f14e0f87-4774-445c-951d-58856c1410e7', '3793b829-a794-4d1e-a061-b6e7df1ee3ef', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1a3e8393-8790-4ca3-8c44-b7bae32177ae', 'f14e0f87-4774-445c-951d-58856c1410e7', '70de15eb-cfb1-491f-a2f1-9125b6158b3a', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1a3e8393-8790-4ca3-8c44-b7bae32177ae', 'f14e0f87-4774-445c-951d-58856c1410e7', '99fbfd7e-7379-4027-bff4-aaa48aa75889', true),

-- Flávia Leães Cortelini: Civil - Execuções, Tributário - Execuções, Tributário - Geral
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1d4ff7ee-dd8c-47b6-b028-7faa2dd4a7dc', 'f14e0f87-4774-445c-951d-58856c1410e7', 'e72be35c-2598-411d-a3d5-74818b7641ea', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1d4ff7ee-dd8c-47b6-b028-7faa2dd4a7dc', 'f14e0f87-4774-445c-951d-58856c1410e7', '70de15eb-cfb1-491f-a2f1-9125b6158b3a', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '1d4ff7ee-dd8c-47b6-b028-7faa2dd4a7dc', 'f14e0f87-4774-445c-951d-58856c1410e7', '3793b829-a794-4d1e-a061-b6e7df1ee3ef', true),

-- Laura Marchezan Rodrigues: Trabalhista - Reclamação Trabalhista, Trabalhista - Acordos e Rescisões
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '9f787ecc-c79b-4dbd-845c-eb46b307e7cb', 'f14e0f87-4774-445c-951d-58856c1410e7', '32cef17e-daf7-461a-a7da-d06c44e8dbf1', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '9f787ecc-c79b-4dbd-845c-eb46b307e7cb', 'f14e0f87-4774-445c-951d-58856c1410e7', '2a8830ad-169f-4c82-8b8f-345c72993897', true),

-- Liéli Benites de Oliveira: Imobiliário - Geral, Civil - Ações Cíveis Gerais, Civil - Execuções
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '5698bdf5-ca3f-4f86-9601-8a4f4b4e8924', 'f14e0f87-4774-445c-951d-58856c1410e7', '8ed52d2a-1a2f-4e37-94d2-b82f55b779b6', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '5698bdf5-ca3f-4f86-9601-8a4f4b4e8924', 'f14e0f87-4774-445c-951d-58856c1410e7', '99fbfd7e-7379-4027-bff4-aaa48aa75889', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '5698bdf5-ca3f-4f86-9601-8a4f4b4e8924', 'f14e0f87-4774-445c-951d-58856c1410e7', 'e72be35c-2598-411d-a3d5-74818b7641ea', true),

-- Luana dos Santos Sarmento: Compliance - Auditoria, Compliance - Denúncia, Trabalhista - Passivo Trabalhista, Trabalhista - Consultivo Trabalhista
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d', 'f14e0f87-4774-445c-951d-58856c1410e7', 'cfdaf716-0d32-43b5-910e-94e77f16a709', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d', 'f14e0f87-4774-445c-951d-58856c1410e7', '52080de9-dccc-424a-a98e-4c8162c60ac1', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d', 'f14e0f87-4774-445c-951d-58856c1410e7', '24eab602-219e-41df-b1f6-bc3063b8dabd', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d', 'f14e0f87-4774-445c-951d-58856c1410e7', '9a2afbcd-aed7-4a1b-b4a0-1a1db297d645', true),

-- Luciana Guimarães Félix Maia: Empresarial - Consultoria Geral, Civil - Responsabilidade Civil
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '4eeed106-c3e8-4111-8b28-49ce0dd42f10', 'f14e0f87-4774-445c-951d-58856c1410e7', '1440c390-98d6-4cb5-bad1-b5b205b4c09b', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '4eeed106-c3e8-4111-8b28-49ce0dd42f10', 'f14e0f87-4774-445c-951d-58856c1410e7', '2324fa1b-dd8c-4cca-83d5-c8e31df3822d', true),

-- Mariana Papaleo Montardo: Contratos - Elaboração, Contratos - Revisão, Contratos - Rescisão, Empresarial - Consultoria Geral
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d', 'f14e0f87-4774-445c-951d-58856c1410e7', '842d7055-c4f3-482a-8eab-d6a61393c651', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d', 'f14e0f87-4774-445c-951d-58856c1410e7', '5a2ab778-ed2e-4cd7-836f-ac7df84e5097', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d', 'f14e0f87-4774-445c-951d-58856c1410e7', '214a0fa8-8ea3-45d9-9247-35b26f10bfb7', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d', 'f14e0f87-4774-445c-951d-58856c1410e7', '1440c390-98d6-4cb5-bad1-b5b205b4c09b', true),

-- Thales Henrique da Rosa: Civil - Execuções
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'cbd1e705-3e74-4b0d-a1ae-4f4df359a847', 'f14e0f87-4774-445c-951d-58856c1410e7', 'e72be35c-2598-411d-a3d5-74818b7641ea', true),

-- Jéssica da Rosa Martins: Civil - Responsabilidade Civil
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', '3bd1df2e-e05d-4ed5-b009-4caf9cf91ae5', 'f14e0f87-4774-445c-951d-58856c1410e7', '2324fa1b-dd8c-4cca-83d5-c8e31df3822d', true),

-- Gabriel Bassan dos Santos: LGPD - Consultoria, LGPD - Incidente de Dados
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'abb4e414-ec97-4df0-9b6d-bdde188c82a6', 'f14e0f87-4774-445c-951d-58856c1410e7', '83c876f7-46f1-420f-91c0-d8373c54534d', true),
  ('a0000000-0000-0000-0000-000000000001', '92ba2f29-28b3-4c9e-a23a-d8daf926db5a', 'abb4e414-ec97-4df0-9b6d-bdde188c82a6', 'f14e0f87-4774-445c-951d-58856c1410e7', '1054a53f-6c82-4bb0-af62-c258c3682e11', true)
ON CONFLICT DO NOTHING;

-- Reabilitar trigger
ALTER TABLE public.partner_contact_capabilities ENABLE TRIGGER enforce_bu_scope_partner_contact_capabilities;