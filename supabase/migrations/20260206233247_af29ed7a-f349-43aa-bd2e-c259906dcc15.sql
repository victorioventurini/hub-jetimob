-- Correção: Adicionar 'people.membership.manage:bu' ao template users_admin_v2
-- Isso permite que admins de usuários criem vínculos BU-usuário ao cadastrar novos usuários

-- Primeiro, verificar se já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM permission_template_items_v2 ti
    JOIN permission_templates_v2 t ON t.id = ti.template_id
    WHERE t.slug = 'users_admin_v2' 
      AND ti.permission_key = 'people.membership.manage:bu'
  ) THEN
    -- Adicionar a permission key ao template
    INSERT INTO permission_template_items_v2 (template_id, permission_key)
    SELECT t.id, 'people.membership.manage:bu'
    FROM permission_templates_v2 t
    WHERE t.slug = 'users_admin_v2';
  END IF;
  
  -- Também adicionar 'people.membership.view:bu' para visualização
  IF NOT EXISTS (
    SELECT 1 
    FROM permission_template_items_v2 ti
    JOIN permission_templates_v2 t ON t.id = ti.template_id
    WHERE t.slug = 'users_admin_v2' 
      AND ti.permission_key = 'people.membership.view:bu'
  ) THEN
    INSERT INTO permission_template_items_v2 (template_id, permission_key)
    SELECT t.id, 'people.membership.view:bu'
    FROM permission_templates_v2 t
    WHERE t.slug = 'users_admin_v2';
  END IF;
END $$;

-- Adicionar comentário de auditoria
COMMENT ON TABLE permission_template_items_v2 IS 'Template permission assignments - Updated 2026-02-06: Added people.membership.manage:bu to users_admin_v2 for user creation flow';