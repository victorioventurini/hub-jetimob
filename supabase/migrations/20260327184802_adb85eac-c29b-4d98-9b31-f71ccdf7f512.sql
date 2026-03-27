
CREATE OR REPLACE FUNCTION public.add_user_bu_access(
  target_user_id uuid,
  target_bu_id uuid,
  p_role_in_bu text DEFAULT 'collaborator',
  p_is_default boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Verificar se o executor é platform admin
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can manage BU access';
  END IF;
  
  -- Buscar o profile_id correspondente ao user_id
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = target_user_id;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', target_user_id;
  END IF;
  
  -- Se marcando como default, remover is_default de outros
  IF p_is_default THEN
    UPDATE bu_user_memberships
    SET is_default = false
    WHERE profile_id = v_profile_id AND is_default = true AND deleted_at IS NULL;
    
    -- Também atualizar profiles.bu_id
    UPDATE profiles
    SET bu_id = target_bu_id, updated_at = now()
    WHERE id = v_profile_id;
  END IF;
  
  -- Tentar reativar membership soft-deleted primeiro
  UPDATE bu_user_memberships
  SET deleted_at = NULL,
      role_in_bu = p_role_in_bu::app_role,
      is_default = p_is_default,
      updated_at = now()
  WHERE user_id = target_user_id
    AND bu_id = target_bu_id
    AND deleted_at IS NOT NULL;
  
  -- Se não reativou nenhuma, inserir nova ou atualizar existente
  IF NOT FOUND THEN
    INSERT INTO bu_user_memberships (profile_id, user_id, bu_id, role_in_bu, is_default)
    VALUES (v_profile_id, target_user_id, target_bu_id, p_role_in_bu::app_role, p_is_default)
    ON CONFLICT (user_id, bu_id) DO UPDATE 
    SET role_in_bu = p_role_in_bu::app_role,
        is_default = EXCLUDED.is_default,
        deleted_at = NULL,
        updated_at = now();
  END IF;
END;
$$;
