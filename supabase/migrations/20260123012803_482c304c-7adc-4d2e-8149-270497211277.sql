-- ============================================================================
-- BACKEND OPTIMIZATION: Fase 1 - Identity Resolution Consolidation
-- TCR v2.64.0 compliant
-- ============================================================================

-- 1. Criar função helper get_permission_scope para simplificar RBAC
-- Esta função extrai a lógica de lookup de scope para reutilização
CREATE OR REPLACE FUNCTION public.get_permission_scope(p_permission_key text)
RETURNS public.permission_scope
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT scope 
  FROM public.permission_catalog 
  WHERE key = p_permission_key 
    AND status = 'active'
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_permission_scope(text) IS 
'Helper function to retrieve permission scope from catalog. Used by user_has_permission_ctx() and other RBAC functions.';

-- 2. Criar função helper check_permission_scope_access para validar contexto
-- Extrai a lógica do CASE statement para função dedicada
CREATE OR REPLACE FUNCTION public.check_permission_scope_access(
  p_user_id uuid,
  p_bu_id uuid,
  p_scope public.permission_scope,
  p_ctx jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid;
  v_target_user_id uuid;
  v_team_id uuid;
  v_contributors uuid[];
BEGIN
  CASE p_scope
    WHEN 'global' THEN
      RETURN true;
    
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'bu' THEN
      RETURN true;
    
    WHEN 'self' THEN
      v_target_user_id := (p_ctx->>'target_user_id')::uuid;
      RETURN v_target_user_id IS NOT NULL AND v_target_user_id = p_user_id;
    
    WHEN 'self_or_owner' THEN
      v_owner_user_id := (p_ctx->>'owner_user_id')::uuid;
      v_contributors := ARRAY(SELECT jsonb_array_elements_text(p_ctx->'contributors')::uuid);
      RETURN (v_owner_user_id IS NOT NULL AND v_owner_user_id = p_user_id)
          OR (p_user_id = ANY(v_contributors));
    
    WHEN 'team' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id = v_team_id
      );
    
    WHEN 'team_tree' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      RETURN EXISTS (
        WITH RECURSIVE team_hierarchy AS (
          SELECT id, parent_team_id FROM public.teams WHERE id = v_team_id AND bu_id = p_bu_id
          UNION ALL
          SELECT t.id, t.parent_team_id FROM public.teams t
          INNER JOIN team_hierarchy th ON t.parent_team_id = th.id
        )
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id IN (SELECT id FROM team_hierarchy)
      );
    
    WHEN 'squad' THEN
      RETURN false;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.check_permission_scope_access(uuid, uuid, public.permission_scope, jsonb) IS 
'Validates user access within a specific permission scope. Extracted from user_has_permission_ctx() for modularity.';

-- 3. Refatorar user_has_permission_ctx para usar as novas helpers
-- Reduz de ~130 linhas para ~60 linhas, mais legível e manutenível
CREATE OR REPLACE FUNCTION public.user_has_permission_ctx(
  p_user_id uuid,
  p_bu_id uuid,
  p_permission_key text,
  p_ctx jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permission_id uuid;
  v_scope public.permission_scope;
  v_has_base_permission boolean := false;
BEGIN
  -- 1) Super admin tem acesso total
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2) BU admin tem acesso amplo na BU
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;

  -- 3) Buscar permission_id e scope (usando nova estrutura)
  SELECT id, scope INTO v_permission_id, v_scope
  FROM public.permission_catalog
  WHERE key = p_permission_key
    AND status = 'active';

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- 4) Verificar override allow individual
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.permission_id = v_permission_id
      AND o.effect = 'allow'
  ) THEN
    v_has_base_permission := true;
  END IF;

  -- 5) Verificar via grupos
  IF NOT v_has_base_permission AND NOT EXISTS (
    SELECT 1
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
      AND pgp.permission_id = v_permission_id
  ) THEN
    RETURN false;
  END IF;

  -- 6) Delegar validação de escopo para função helper
  RETURN check_permission_scope_access(p_user_id, p_bu_id, v_scope, p_ctx);
END;
$$;

COMMENT ON FUNCTION public.user_has_permission_ctx(uuid, uuid, text, jsonb) IS 
'Verifies if user has permission with contextual scope validation. Refactored to use helper functions for modularity. TCR v2.64.0 compliant.';

-- 4. Adicionar comentários nas funções de identity existentes para clareza
COMMENT ON FUNCTION public.my_profile_id() IS 
'CANONICAL: Returns the profile.id for the currently authenticated user. Primary identity function for RLS policies.';

COMMENT ON FUNCTION public.profile_id_from_user_id(uuid) IS 
'CANONICAL: Converts auth.users.id to profiles.id. Use this when you have user_id and need profile_id.';

COMMENT ON FUNCTION public.get_profile_id(uuid) IS 
'ALIAS for profile_id_from_user_id(). Maintained for backward compatibility.';

COMMENT ON FUNCTION public.resolve_participant_identity(uuid, uuid) IS 
'CANONICAL: Resolves participant identity from both profiles (internal) and partner_contacts (external). Returns unified TABLE structure.';

COMMENT ON FUNCTION public.resolve_notification_recipient(uuid) IS 
'Resolves notification recipient info. Handles both auth.users.id and legacy profiles.id inputs for backward compatibility.';