
-- ================================================================
-- Phone Lines: Permission Keys + Templates v2
-- Mirrors the pattern from Inventário/Chaves/Brindes
-- ================================================================

-- 1. Permission Catalog Keys for phone_lines
INSERT INTO permission_catalog (key, module, resource, action, scope, description, status) VALUES
  -- View
  ('assets.phone_lines.view:bu', 'assets', 'phone_lines', 'view', 'bu', 'Visualizar linhas telefônicas', 'active'),
  ('assets.phone_lines.read:bu', 'assets', 'phone_lines', 'read', 'bu', 'Ler dados de linhas telefônicas', 'active'),
  -- CRUD
  ('assets.phone_lines.create:bu', 'assets', 'phone_lines', 'create', 'bu', 'Criar linhas telefônicas', 'active'),
  ('assets.phone_lines.update:bu', 'assets', 'phone_lines', 'update', 'bu', 'Editar linhas telefônicas', 'active'),
  ('assets.phone_lines.delete:bu', 'assets', 'phone_lines', 'delete', 'bu', 'Excluir linhas telefônicas', 'active'),
  -- Operations
  ('assets.phone_lines.loan:bu', 'assets', 'phone_lines', 'loan', 'bu', 'Emprestar linha telefônica a usuário', 'active'),
  ('assets.phone_lines.return:bu', 'assets', 'phone_lines', 'return', 'bu', 'Devolver linha telefônica', 'active'),
  ('assets.phone_lines.link_asset:bu', 'assets', 'phone_lines', 'link_asset', 'bu', 'Vincular linha a ativo de inventário', 'active')
ON CONFLICT (key) DO NOTHING;

-- 2. Templates v2

-- 2.1 Linhas: Admin v2 (ADMINISTER)
INSERT INTO permission_templates_v2 (id, slug, name, description, surface, module, is_system, version)
VALUES (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  'phone_lines_admin_v2',
  'Linhas: Admin v2',
  'Gestão completa de linhas telefônicas',
  'administer',
  'assets',
  true,
  2
) ON CONFLICT (slug) DO NOTHING;

-- 2.2 Linhas: Operador v2 (OPERATE)
INSERT INTO permission_templates_v2 (id, slug, name, description, surface, module, is_system, version)
VALUES (
  'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  'phone_lines_operate_v2',
  'Linhas: Operador v2',
  'Emprestar e devolver linhas telefônicas',
  'operate',
  'assets',
  true,
  2
) ON CONFLICT (slug) DO NOTHING;

-- 2.3 Linhas: Visualização v2 (VIEW)
INSERT INTO permission_templates_v2 (id, slug, name, description, surface, module, is_system, version)
VALUES (
  'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  'phone_lines_view_v2',
  'Linhas: Visualização v2',
  'Leitura de linhas telefônicas',
  'view',
  'assets',
  true,
  2
) ON CONFLICT (slug) DO NOTHING;

-- 3. Template Items

-- 3.1 Admin: all keys
INSERT INTO permission_template_items_v2 (template_id, permission_key) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.view:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.view:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.read:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.create:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.update:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.delete:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.loan:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.return:bu'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'assets.phone_lines.link_asset:bu')
ON CONFLICT DO NOTHING;

-- 3.2 Operador: view + operational actions
INSERT INTO permission_template_items_v2 (template_id, permission_key) VALUES
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'assets.view:bu'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'assets.phone_lines.view:bu'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'assets.phone_lines.read:bu'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'assets.phone_lines.loan:bu'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'assets.phone_lines.return:bu')
ON CONFLICT DO NOTHING;

-- 3.3 Visualização: read-only
INSERT INTO permission_template_items_v2 (template_id, permission_key) VALUES
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'assets.view:bu'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'assets.phone_lines.view:bu'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'assets.phone_lines.read:bu')
ON CONFLICT DO NOTHING;
