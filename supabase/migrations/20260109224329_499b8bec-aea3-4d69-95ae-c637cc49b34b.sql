-- ============================================================
-- IDENTITY CUTOVER v3.0 — Phase 0.5: Pre-Monitoring Fixes
-- ============================================================
-- Entregáveis:
-- A) Storage Policy ticket-attachments -> profile-first + soft delete
-- B) 2 funções profile-first faltantes
-- C) 5 funções legadas com canary flag
-- D) 2 views legadas recriadas profile-first
-- ============================================================

-- ============================================================
-- A) STORAGE POLICY: ticket-attachments (profile-first + soft delete)
-- ============================================================

-- Dropar policy legada
DROP POLICY IF EXISTS "Users can delete their own ticket attachments" ON storage.objects;

-- Recriar usando profile_id + soft delete
CREATE POLICY "Users can delete their own ticket attachments" 
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT bu_id::text 
    FROM bu_user_memberships 
    WHERE profile_id = my_profile_id() 
      AND deleted_at IS NULL
  )
);

-- ============================================================
-- B) 2 FUNÇÕES PROFILE-FIRST FALTANTES
-- ============================================================

-- profile_has_bu_access(profile_id, bu_id) - equivalente de user_has_bu_access
CREATE OR REPLACE FUNCTION profile_has_bu_access(p_profile_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships
    WHERE profile_id = p_profile_id
      AND bu_id = p_bu_id
      AND deleted_at IS NULL
  )
$$;

COMMENT ON FUNCTION profile_has_bu_access(uuid, uuid) IS 
'[IDENTITY v3.0] Profile-first equivalent of user_has_bu_access. Checks if profile has active membership in BU.';

-- get_profile_default_bu(profile_id) - equivalente de get_user_default_bu
CREATE OR REPLACE FUNCTION get_profile_default_bu(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT bu_id FROM bu_user_memberships
  WHERE profile_id = p_profile_id
    AND is_default = true
    AND deleted_at IS NULL
  LIMIT 1
$$;

COMMENT ON FUNCTION get_profile_default_bu(uuid) IS 
'[IDENTITY v3.0] Profile-first equivalent of get_user_default_bu. Returns default BU for profile.';

-- ============================================================
-- C) CANARY NAS 5 FUNÇÕES LEGADAS
-- ============================================================
-- Comportamento:
-- - Se identity_cutover_strict = true: RAISE EXCEPTION
-- - Se identity_cutover_strict = false: fallback via profile_id_from_user_id()
-- ============================================================

-- 1. is_bu_member(user_id, bu_id) -> is_profile_bu_member
CREATE OR REPLACE FUNCTION is_bu_member(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strict boolean;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] is_bu_member(user_id, bu_id) is deprecated. Use is_profile_bu_member(my_profile_id(), bu_id) instead.';
  END IF;
  
  -- Fallback: convert user_id to profile_id
  v_profile_id := profile_id_from_user_id(p_user_id);
  RETURN is_profile_bu_member(v_profile_id, p_bu_id);
END;
$$;

COMMENT ON FUNCTION is_bu_member(uuid, uuid) IS 
'[DEPRECATED] Legacy function with canary. Use is_profile_bu_member(profile_id, bu_id) instead.';

-- 2. is_bu_admin(user_id, bu_id) -> is_profile_bu_admin
CREATE OR REPLACE FUNCTION is_bu_admin(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strict boolean;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] is_bu_admin(user_id, bu_id) is deprecated. Use is_profile_bu_admin(my_profile_id(), bu_id) instead.';
  END IF;
  
  -- Fallback: convert user_id to profile_id
  v_profile_id := profile_id_from_user_id(p_user_id);
  RETURN is_profile_bu_admin(v_profile_id, p_bu_id);
END;
$$;

COMMENT ON FUNCTION is_bu_admin(uuid, uuid) IS 
'[DEPRECATED] Legacy function with canary. Use is_profile_bu_admin(profile_id, bu_id) instead.';

-- 3. user_has_bu_access(user_id, bu_id) -> profile_has_bu_access
CREATE OR REPLACE FUNCTION user_has_bu_access(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strict boolean;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] user_has_bu_access(user_id, bu_id) is deprecated. Use profile_has_bu_access(my_profile_id(), bu_id) instead.';
  END IF;
  
  -- Fallback: convert user_id to profile_id
  v_profile_id := profile_id_from_user_id(p_user_id);
  RETURN profile_has_bu_access(v_profile_id, p_bu_id);
END;
$$;

COMMENT ON FUNCTION user_has_bu_access(uuid, uuid) IS 
'[DEPRECATED] Legacy function with canary. Use profile_has_bu_access(profile_id, bu_id) instead.';

-- 4. get_user_bus(user_id) -> get_profile_bus
CREATE OR REPLACE FUNCTION get_user_bus(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strict boolean;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] get_user_bus(user_id) is deprecated. Use get_profile_bus(my_profile_id()) instead.';
  END IF;
  
  -- Fallback: convert user_id to profile_id and return bu_ids
  v_profile_id := profile_id_from_user_id(p_user_id);
  RETURN QUERY SELECT bu_id FROM bu_user_memberships 
    WHERE profile_id = v_profile_id AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION get_user_bus(uuid) IS 
'[DEPRECATED] Legacy function with canary. Use get_profile_bus(profile_id) instead.';

-- 5. get_user_default_bu(user_id) -> get_profile_default_bu
CREATE OR REPLACE FUNCTION get_user_default_bu(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strict boolean;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] get_user_default_bu(user_id) is deprecated. Use get_profile_default_bu(my_profile_id()) instead.';
  END IF;
  
  -- Fallback: convert user_id to profile_id
  v_profile_id := profile_id_from_user_id(p_user_id);
  RETURN get_profile_default_bu(v_profile_id);
END;
$$;

COMMENT ON FUNCTION get_user_default_bu(uuid) IS 
'[DEPRECATED] Legacy function with canary. Use get_profile_default_bu(profile_id) instead.';

-- ============================================================
-- D) RECRIAR 2 VIEWS LEGADAS (profile-first + soft delete)
-- ============================================================

-- 1. users_without_v2_permissions
-- Corrigido: JOIN via profile_id, filtro deleted_at, sem expor auth user_id
DROP VIEW IF EXISTS users_without_v2_permissions;

CREATE VIEW users_without_v2_permissions AS
SELECT 
  m.id AS membership_id,
  m.bu_id,
  m.profile_id,
  p.display_name,
  p.work_email,
  b.name AS bu_name
FROM bu_user_memberships m
JOIN profiles p ON p.id = m.profile_id
JOIN bu_units b ON b.id = m.bu_id
WHERE m.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM bu_user_permission_templates_v2 t2
    WHERE t2.user_id = m.profile_id 
      AND t2.bu_id = m.bu_id
  );

COMMENT ON VIEW users_without_v2_permissions IS 
'[IDENTITY v3.0] Profile-first view. Lists active memberships without V2 permission templates.';

-- 2. v_users_without_templates
-- Corrigido: JOIN via profile_id, filtro deleted_at, sem expor auth user_id
DROP VIEW IF EXISTS v_users_without_templates;

CREATE VIEW v_users_without_templates AS
SELECT 
  m.profile_id,
  m.bu_id,
  p.display_name,
  p.work_email,
  m.role_in_bu,
  m.created_at AS membership_created_at
FROM bu_user_memberships m
JOIN profiles p ON p.id = m.profile_id
LEFT JOIN bu_user_permission_templates_v2 t 
  ON t.user_id = m.profile_id AND t.bu_id = m.bu_id
WHERE m.deleted_at IS NULL
  AND t.id IS NULL
  AND m.role_in_bu NOT IN ('super_admin', 'admin');

COMMENT ON VIEW v_users_without_templates IS 
'[IDENTITY v3.0] Profile-first guardrail view. Lists active non-admin memberships without permission templates.';