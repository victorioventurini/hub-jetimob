
-- 1. Add projects read keys to collaborator_base_v2
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT 
  pt.id,
  pc.key
FROM permission_templates_v2 pt
CROSS JOIN (
  SELECT key FROM permission_catalog WHERE key IN ('projects.project.read:bu', 'projects.milestone.read:bu')
) pc
WHERE pt.slug = 'collaborator_base_v2'
ON CONFLICT DO NOTHING;

-- 2. Assign projects_manager to all internal BU members who don't already have it
INSERT INTO bu_user_permission_templates_v2 (bu_id, user_id, template_id)
SELECT DISTINCT
  bum.bu_id,
  p.id as user_id,  -- profile_id
  pm.id as template_id
FROM bu_user_memberships bum
JOIN profiles p ON p.user_id = bum.user_id
CROSS JOIN (SELECT id FROM permission_templates_v2 WHERE slug = 'projects_manager') pm
WHERE bum.role_in_bu != 'external'
  AND NOT EXISTS (
    SELECT 1 FROM bu_user_permission_templates_v2 existing
    WHERE existing.bu_id = bum.bu_id
      AND existing.user_id = p.id
      AND existing.template_id = pm.id
  );
