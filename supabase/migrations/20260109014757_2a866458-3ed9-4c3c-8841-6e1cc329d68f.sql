-- =====================================================
-- PHASE 3.1: NOTIFICATION HEALTH ALERTS - PERMISSION ENTRIES
-- =====================================================

-- Permission catalog entries (correct columns: key, module, resource, action, scope, description)
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES 
  ('notifications.health.read:bu', 'notifications', 'health', 'read', 'bu', 'Visualizar alertas de saúde da central de notificações', 'active'),
  ('notifications.health.admin:bu', 'notifications', 'health', 'admin', 'bu', 'Gerenciar alertas de saúde (futuro)', 'active')
ON CONFLICT (key) DO NOTHING;

-- Add permissions to admin templates (if template exists)
DO $$
DECLARE
  v_admin_template_id UUID;
  v_perm_read_id UUID;
  v_perm_admin_id UUID;
BEGIN
  -- Get admin template
  SELECT id INTO v_admin_template_id 
  FROM permission_templates_v2 
  WHERE slug = 'bu_admin' 
  LIMIT 1;
  
  IF v_admin_template_id IS NOT NULL THEN
    -- Get permission IDs
    SELECT id INTO v_perm_read_id FROM permission_catalog WHERE key = 'notifications.health.read:bu';
    SELECT id INTO v_perm_admin_id FROM permission_catalog WHERE key = 'notifications.health.admin:bu';
    
    -- Add to template
    IF v_perm_read_id IS NOT NULL THEN
      INSERT INTO permission_template_items_v2 (template_id, permission_id)
      VALUES (v_admin_template_id, v_perm_read_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_perm_admin_id IS NOT NULL THEN
      INSERT INTO permission_template_items_v2 (template_id, permission_id)
      VALUES (v_admin_template_id, v_perm_admin_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;