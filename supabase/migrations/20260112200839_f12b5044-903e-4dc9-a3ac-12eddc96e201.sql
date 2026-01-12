-- ============================================
-- Fix: Add missing okrs.links.manage:bu permission to OKR templates
-- This permission is required for creating dependencies in OKR wizard
-- ============================================

-- Add the permission to okrs_operate_v2 template
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT 
  pt.id,
  'okrs.links.manage:bu'
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_operate_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;

-- Also add to okrs_admin_v2 for completeness
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT 
  pt.id,
  'okrs.links.manage:bu'
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_admin_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;