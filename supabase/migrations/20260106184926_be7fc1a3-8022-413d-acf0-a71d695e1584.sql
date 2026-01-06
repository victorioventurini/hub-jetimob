-- =============================================
-- Permission Core - Funções centralizadas
-- =============================================

-- 1) Função get_my_permissions: retorna array de permission keys para o usuário logado
CREATE OR REPLACE FUNCTION public.get_my_permissions(p_bu_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_permissions text[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- 1) Super admin tem acesso total (wildcard)
  IF is_super_admin(v_user_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- 2) BU admin tem acesso amplo na BU (wildcard)
  IF is_bu_admin(v_user_id, p_bu_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- 3) Verificar acesso à BU
  IF NOT user_has_bu_access(v_user_id, p_bu_id) THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- 4) Agregar permissões de grupos + overrides
  SELECT ARRAY_AGG(DISTINCT pc.key)
  INTO v_permissions
  FROM (
    -- Permissões via grupos
    SELECT pgp.permission_id
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = v_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
    
    UNION
    
    -- Permissões via overrides (allow)
    SELECT o.permission_id
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = v_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
  ) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  RETURN COALESCE(v_permissions, ARRAY[]::text[]);
END;
$$;

-- 2) Função has_permission_key (wrapper simplificado)
CREATE OR REPLACE FUNCTION public.has_permission_key(
  p_user_id uuid,
  p_bu_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Usar a lógica existente de user_has_permission
  RETURN user_has_permission(p_user_id, p_bu_id, p_permission_key);
END;
$$;

-- 3) Adicionar permissões faltantes ao catálogo (hub.global)
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES 
  ('hub.global.view', 'hub', 'global', 'view', 'global', 'Visualizar configurações globais do Hub', 'active'),
  ('hub.global.manage', 'hub', 'global', 'manage', 'global', 'Gerenciar configurações globais do Hub (somente super_admin)', 'active')
ON CONFLICT (key) DO NOTHING;