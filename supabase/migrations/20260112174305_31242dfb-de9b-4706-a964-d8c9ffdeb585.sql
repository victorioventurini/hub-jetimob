-- Popular permission_template_items_v2 para templates v2 vazios
-- Baseado em WAVE6_TEMPLATE_DIFF.md

-- =====================================================
-- TICKETS
-- =====================================================

-- tickets_view_v2 (3 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('tickets.ticket.view:bu'),
  ('tickets.thread.read:bu'),
  ('tickets.attachment.create:bu')
) AS pk(key)
WHERE pt.slug = 'tickets_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- tickets_operate_v2 (8 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('tickets.ticket.view:bu'),
  ('tickets.thread.read:bu'),
  ('tickets.thread.create:bu'),
  ('tickets.message.create:bu'),
  ('tickets.attachment.create:bu'),
  ('tickets.ticket.create_internal:bu'),
  ('tickets.ticket.assign:bu'),
  ('tickets.ticket.update_status:bu')
) AS pk(key)
WHERE pt.slug = 'tickets_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- tickets_admin_v2 = todas as keys de tickets
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'tickets_admin_v2'
  AND pc.module = 'tickets'
ON CONFLICT DO NOTHING;

-- =====================================================
-- KPIS
-- =====================================================

-- kpis_view_v2 (3 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('kpis.view:bu'),
  ('kpis.metric.view:bu'),
  ('kpis.value.read:bu')
) AS pk(key)
WHERE pt.slug = 'kpis_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- kpis_operate_v2 (7 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('kpis.view:bu'),
  ('kpis.metric.view:bu'),
  ('kpis.value.read:bu'),
  ('kpis.value.create:bu'),
  ('kpis.value.add:bu'),
  ('kpis.value.update_own:bu'),
  ('kpis.metric.update:self_or_owner')
) AS pk(key)
WHERE pt.slug = 'kpis_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- kpis_admin_v2 = todas as keys de kpis
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'kpis_admin_v2'
  AND pc.module = 'kpis'
ON CONFLICT DO NOTHING;

-- =====================================================
-- TEAMS
-- =====================================================

-- teams_view_v2 (3 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('teams.view:bu'),
  ('teams.team.read:bu'),
  ('teams.squad.read:bu')
) AS pk(key)
WHERE pt.slug = 'teams_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- teams_operate_v2 (view + gestão própria)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('teams.view:bu'),
  ('teams.team.read:bu'),
  ('teams.squad.read:bu'),
  ('teams.team.update:self'),
  ('teams.member.manage:self')
) AS pk(key)
WHERE pt.slug = 'teams_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- teams_admin_v2 = todas as keys de teams
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'teams_admin_v2'
  AND pc.module = 'teams'
ON CONFLICT DO NOTHING;

-- =====================================================
-- USERS
-- =====================================================

-- users_view_v2 (1 key)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('users.list.view:bu')
) AS pk(key)
WHERE pt.slug = 'users_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- users_operate_v2 (2 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('users.profile.view:bu'),
  ('users.profile.update:self')
) AS pk(key)
WHERE pt.slug = 'users_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- users_admin_v2 = todas as keys de users
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'users_admin_v2'
  AND pc.module = 'users'
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSETS - INVENTORY
-- =====================================================

-- inventory_view_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.inventory.view:bu'),
  ('assets.inventory.read:bu')
) AS pk(key)
WHERE pt.slug = 'inventory_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- inventory_operate_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.inventory.view:bu'),
  ('assets.inventory.read:bu'),
  ('assets.inventory.checkout:bu'),
  ('assets.inventory.return:bu'),
  ('assets.inventory.movement.create:bu')
) AS pk(key)
WHERE pt.slug = 'inventory_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- inventory_admin_v2 = todas as keys de assets.inventory.*
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'inventory_admin_v2'
  AND (pc.key LIKE 'assets.inventory.%' OR pc.key = 'assets.view:bu' OR pc.key = 'assets.categories.manage:bu' OR pc.key = 'assets.settings.manage')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSETS - KEYS
-- =====================================================

-- keys_view_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.keys.view:bu'),
  ('assets.keys.read:bu')
) AS pk(key)
WHERE pt.slug = 'keys_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- keys_operate_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.keys.view:bu'),
  ('assets.keys.read:bu'),
  ('assets.keys.checkout:bu'),
  ('assets.keys.keyring.checkout:bu'),
  ('assets.keys.keyring.return:bu'),
  ('assets.keys.movement.create:bu')
) AS pk(key)
WHERE pt.slug = 'keys_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- keys_admin_v2 = todas as keys de assets.keys.*
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'keys_admin_v2'
  AND (pc.key LIKE 'assets.keys.%' OR pc.key = 'assets.view:bu')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSETS - GIFTS
-- =====================================================

-- gifts_view_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.gifts.view:bu'),
  ('assets.gifts.read:bu')
) AS pk(key)
WHERE pt.slug = 'gifts_view_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- gifts_operate_v2
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('assets.view:bu'),
  ('assets.gifts.view:bu'),
  ('assets.gifts.read:bu'),
  ('assets.gifts.movement.create:bu'),
  ('assets.gifts.adjustment.create:bu')
) AS pk(key)
WHERE pt.slug = 'gifts_operate_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;

-- gifts_admin_v2 = todas as keys de assets.gifts.*
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pc.key
FROM public.permission_templates_v2 pt
CROSS JOIN public.permission_catalog pc
WHERE pt.slug = 'gifts_admin_v2'
  AND (pc.key LIKE 'assets.gifts.%' OR pc.key = 'assets.view:bu')
ON CONFLICT DO NOTHING;

-- =====================================================
-- EXTERNAL CONTACT
-- =====================================================

-- external_contact_v2 (4 keys)
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (VALUES 
  ('tickets.thread.read:bu'),
  ('tickets.message.create:bu'),
  ('tickets.attachment.create:bu'),
  ('users.profile.update:self')
) AS pk(key)
WHERE pt.slug = 'external_contact_v2'
  AND EXISTS (SELECT 1 FROM public.permission_catalog pc WHERE pc.key = pk.key)
ON CONFLICT DO NOTHING;