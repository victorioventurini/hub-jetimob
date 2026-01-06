-- =============================================
-- PERMISSIONS AUDIT - Adicionar permission keys ausentes
-- =============================================

INSERT INTO permission_catalog (key, module, resource, action, scope, description, status) VALUES
  ('platform.settings.view', 'platform', 'settings', 'view', 'global', 'Visualizar configurações globais da plataforma', 'active'),
  ('platform.settings.manage', 'platform', 'settings', 'manage', 'global', 'Gerenciar configurações globais da plataforma', 'active'),
  ('hub.permissions.view', 'hub', 'permissions', 'view', 'bu', 'Visualizar permissões da BU', 'active'),
  ('hub.permissions.manage', 'hub', 'permissions', 'manage', 'bu', 'Gerenciar permissões de usuários da BU', 'active'),
  ('users.profile.delete', 'users', 'profile', 'delete', 'bu', 'Excluir perfil de usuário (soft delete)', 'active'),
  ('users.profile.create', 'users', 'profile', 'create', 'bu', 'Criar perfil de usuário', 'active'),
  ('assets.settings.manage', 'assets', 'settings', 'manage', 'bu', 'Gerenciar configurações do módulo de ativos', 'active'),
  ('tickets.settings.view', 'tickets', 'settings', 'view', 'bu', 'Visualizar configurações de tickets', 'active'),
  ('tickets.settings.manage', 'tickets', 'settings', 'manage', 'bu', 'Gerenciar configurações de tickets', 'active')
ON CONFLICT (key) DO NOTHING;

-- Criar função has_permission (nova, não existe ainda)
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions text[];
BEGIN
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  SELECT ARRAY_AGG(DISTINCT pc.key)
  INTO v_permissions
  FROM (
    SELECT pgp.permission_id
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
    UNION
    SELECT o.permission_id
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
  ) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  RETURN p_permission_key = ANY(COALESCE(v_permissions, ARRAY[]::text[]));
END;
$$;