-- 1. Insert the events module into the modules catalog
INSERT INTO modules (id, name, slug, description, icon, route, type, status, display_order)
VALUES (
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
  'Events',
  'events',
  'Jet Experience — Patrocinadores & ROI',
  'calendar',
  '/events',
  'operational',
  'active',
  60
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Enable the module for BU "Jet Experience"
INSERT INTO bu_module_configs (bu_id, module_id, is_enabled, enabled_at)
VALUES (
  'f3d2d8a5-2143-42f0-8738-9b51fb74b49f',
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
  true,
  now()
)
ON CONFLICT (bu_id, module_id) DO UPDATE SET is_enabled = true, enabled_at = now();