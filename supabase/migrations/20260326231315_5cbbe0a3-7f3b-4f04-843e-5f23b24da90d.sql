-- ============================================================
-- Projects Permission Templates
-- ============================================================

-- 3a. Create projects_manager template
INSERT INTO permission_templates_v2 (name, slug, description, surface, module, is_system)
VALUES (
  'Projetos: Gestor',
  'projects_manager',
  'Gestão de projetos e milestones — criar, editar, sem exclusão',
  'operate',
  'projects',
  false
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT t.id, k.key
FROM permission_templates_v2 t,
  (VALUES
    ('projects.project.read:bu'),
    ('projects.project.create:bu'),
    ('projects.project.update:bu'),
    ('projects.project.update:self_or_owner'),
    ('projects.milestone.read:bu'),
    ('projects.milestone.create:bu'),
    ('projects.milestone.update:bu')
  ) AS k(key)
WHERE t.slug = 'projects_manager'
ON CONFLICT DO NOTHING;

-- 3b. Create projects_admin template
INSERT INTO permission_templates_v2 (name, slug, description, surface, module, is_system)
VALUES (
  'Projetos: Admin',
  'projects_admin',
  'Gestão completa de projetos — inclui exclusão',
  'administer',
  'projects',
  false
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT t.id, k.key
FROM permission_templates_v2 t,
  (VALUES
    ('projects.project.read:bu'),
    ('projects.project.create:bu'),
    ('projects.project.update:bu'),
    ('projects.project.update:self_or_owner'),
    ('projects.project.delete:self_or_owner'),
    ('projects.milestone.read:bu'),
    ('projects.milestone.create:bu'),
    ('projects.milestone.update:bu')
  ) AS k(key)
WHERE t.slug = 'projects_admin'
ON CONFLICT DO NOTHING;