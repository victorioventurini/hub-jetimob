
-- ============================================================
-- Fix: Remover referências a is_active em user_team_memberships
-- 
-- A tabela user_team_memberships NÃO tem coluna is_active.
-- Existência do registro = membro ativo.
-- ============================================================

-- 1. Fix user_has_permission_ctx
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
  v_owner_user_id uuid;
  v_target_user_id uuid;
  v_team_id uuid;
  v_contributors uuid[];
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

  -- 3) Buscar permission_id e scope
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

  -- 6) Validar escopo baseado no contexto
  CASE v_scope
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
      -- user_team_memberships: existence = active (no is_active column)
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id = v_team_id
      );
    
    WHEN 'team_tree' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      -- user_team_memberships: existence = active (no is_active column)
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

-- 2. Fix get_visible_ticket_ids_for_impersonation
CREATE OR REPLACE FUNCTION public.get_visible_ticket_ids_for_impersonation(p_profile_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_result uuid[];
  v_auth_uid uuid;
  v_partner_contact_id uuid;
BEGIN
  -- Get auth user_id from profile to check partner_contact participation
  SELECT p.user_id INTO v_auth_uid
  FROM public.profiles p
  WHERE p.id = p_profile_id;
  
  -- Check if profile has linked partner contact
  SELECT pc.id INTO v_partner_contact_id
  FROM public.partner_contacts pc
  WHERE pc.email = (SELECT work_email FROM public.profiles WHERE id = p_profile_id);

  SELECT ARRAY_AGG(t.id) INTO v_result
  FROM public.tickets t
  WHERE t.deleted_at IS NULL AND (
    -- Visibility: creator or owner
    t.created_by_user_id = p_profile_id OR t.owner_user_id = p_profile_id
    
    -- Visibility: participant (internal)
    OR EXISTS (
      SELECT 1 FROM public.ticket_participants tp 
      WHERE tp.ticket_id = t.id AND tp.profile_id = p_profile_id AND tp.is_active = true
    )
    
    -- Visibility: participant (external via partner_contact)
    OR (v_partner_contact_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ticket_participants tp 
      WHERE tp.ticket_id = t.id AND tp.partner_contact_id = v_partner_contact_id AND tp.is_active = true
    ))
    
    -- Visibility: all (bu members)
    OR (t.visibility = 'all' AND is_profile_bu_member(p_profile_id, t.bu_id))
    
    -- Visibility: teams (user_team_memberships: existence = active)
    OR (t.visibility = 'teams' AND EXISTS (
      SELECT 1 FROM public.user_team_memberships utm 
      WHERE utm.user_id = p_profile_id 
        AND utm.team_id = ANY(t.visibility_team_ids)
    ))
    
    -- Visibility: squads (squad_memberships: deleted_at IS NULL = active)
    OR (t.visibility = 'squads' AND EXISTS (
      SELECT 1 FROM public.squad_memberships sm 
      WHERE sm.user_id = p_profile_id 
        AND sm.squad_id = ANY(t.visibility_squad_ids) 
        AND sm.deleted_at IS NULL
    ))
    
    -- Visibility: users
    OR (t.visibility = 'users' AND p_profile_id = ANY(t.visibility_user_ids))
  );
  RETURN COALESCE(v_result, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION user_has_permission_ctx IS 'Verifica permissão com contexto. user_team_memberships: existence = active.';
COMMENT ON FUNCTION get_visible_ticket_ids_for_impersonation IS 'Retorna IDs de tickets visíveis para impersonation. user_team_memberships: existence = active.';
