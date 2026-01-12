-- ============================================
-- FIX: Add the new permission to permission_catalog
-- ============================================

-- Add the new permission to permission_catalog if it doesn't exist
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description)
VALUES 
  ('settings.ai.view_logs:bu', 'settings', 'ai', 'view_logs', 'bu', 'Permite visualizar logs de agentes de IA da unidade')
ON CONFLICT (key) DO NOTHING;

-- Add permission to admin templates
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, 'settings.ai.view_logs:bu'
FROM public.permission_templates_v2 pt
WHERE pt.slug IN ('admin_v2', 'super_admin_v2', 'platform_admin')
ON CONFLICT DO NOTHING;