-- ============================================
-- Fix: Add missing okrs.checkin.create:self_or_owner permission to operate template
-- The RLS policy requires this permission, but the template only has okrs.checkin.create:self
-- ============================================

-- Add the permission to okrs_operate_v2 template
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT 
  pt.id,
  'okrs.checkin.create:self_or_owner'
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_operate_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;