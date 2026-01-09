-- ============================================================
-- GLOBAL USERS ADMIN MODULE - Database Functions
-- ============================================================

-- RPC para listar todos os usuários com dados consolidados
CREATE OR REPLACE FUNCTION get_global_users_admin(
  p_search text DEFAULT NULL,
  p_bu_id uuid DEFAULT NULL,
  p_onboarding_status text DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  display_name text,
  work_email text,
  onboarding_completed boolean,
  primary_bu_id uuid,
  primary_bu_name text,
  last_sign_in_at timestamptz,
  global_role text,
  bu_accesses jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.work_email,
    p.onboarding_completed,
    p.bu_id,
    bu.name,
    u.last_sign_in_at,
    ur.role::text,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'bu_id', m.bu_id,
        'bu_name', bu2.name,
        'role_in_bu', m.role_in_bu,
        'is_default', m.is_default
      ) ORDER BY bu2.name)
      FROM bu_user_memberships m
      JOIN bu_units bu2 ON m.bu_id = bu2.id
      WHERE m.user_id = p.user_id),
      '[]'::jsonb
    )
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN bu_units bu ON p.bu_id = bu.id
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.deleted_at IS NULL
    AND is_platform_admin(auth.uid())
    AND (p_search IS NULL OR p.display_name ILIKE '%' || p_search || '%' OR p.work_email ILIKE '%' || p_search || '%')
    AND (p_bu_id IS NULL OR EXISTS (
      SELECT 1 FROM bu_user_memberships m2 WHERE m2.user_id = p.user_id AND m2.bu_id = p_bu_id
    ))
    AND (
      p_onboarding_status IS NULL 
      OR (p_onboarding_status = 'completed' AND p.onboarding_completed = true)
      OR (p_onboarding_status = 'pending' AND (p.onboarding_completed = false OR p.onboarding_completed IS NULL))
    )
  ORDER BY p.display_name NULLS LAST
$$;

-- RPC para resetar onboarding de um usuário
CREATE OR REPLACE FUNCTION reset_user_onboarding(target_profile_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o executor é platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can reset onboarding';
  END IF;
  
  UPDATE profiles
  SET onboarding_completed = false,
      updated_at = now()
  WHERE id = target_profile_id;
END;
$$;

-- RPC para atualizar role global de um usuário
CREATE OR REPLACE FUNCTION update_user_global_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  executor_role text;
BEGIN
  -- Verificar se o executor é platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can update global roles';
  END IF;
  
  -- Verificar role do executor
  SELECT role INTO executor_role FROM user_roles WHERE user_id = auth.uid();
  
  -- Apenas super_admin pode promover a super_admin
  IF new_role = 'super_admin' AND executor_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super_admin can promote to super_admin';
  END IF;
  
  -- Remove role existente se new_role for null/vazio
  IF new_role IS NULL OR new_role = '' THEN
    DELETE FROM user_roles WHERE user_id = target_user_id;
  ELSE
    -- Upsert role
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, new_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END;
$$;

-- RPC para adicionar acesso a BU
CREATE OR REPLACE FUNCTION add_user_bu_access(
  target_user_id uuid,
  target_bu_id uuid,
  p_role_in_bu text DEFAULT 'collaborator',
  p_is_default boolean DEFAULT false
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o executor é platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can manage BU access';
  END IF;
  
  -- Se marcando como default, remover is_default de outros
  IF p_is_default THEN
    UPDATE bu_user_memberships
    SET is_default = false
    WHERE user_id = target_user_id AND is_default = true;
  END IF;
  
  -- Inserir ou atualizar membership
  INSERT INTO bu_user_memberships (user_id, bu_id, role_in_bu, is_default)
  VALUES (target_user_id, target_bu_id, p_role_in_bu, p_is_default)
  ON CONFLICT (user_id, bu_id) DO UPDATE 
  SET role_in_bu = EXCLUDED.role_in_bu,
      is_default = EXCLUDED.is_default,
      updated_at = now();
END;
$$;

-- RPC para remover acesso a BU
CREATE OR REPLACE FUNCTION remove_user_bu_access(
  target_user_id uuid,
  target_bu_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o executor é platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can manage BU access';
  END IF;
  
  DELETE FROM bu_user_memberships
  WHERE user_id = target_user_id AND bu_id = target_bu_id;
END;
$$;