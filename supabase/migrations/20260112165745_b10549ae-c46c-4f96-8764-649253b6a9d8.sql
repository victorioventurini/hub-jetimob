-- ============================================================
-- FIX: Remove V1 references from permission functions
-- The tables bu_user_permission_groups, bu_permission_group_configs,
-- and permission_group_permissions were dropped in Wave 8.
-- These functions now use ONLY V2 templates.
-- ============================================================

-- 1. Fix has_permission - V2 Only version
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id uuid;
BEGIN
  -- Convert profile_id to auth.users.id for is_super_admin check
  -- p_user_id is a profile_id (from my_profile_id()), but is_super_admin expects auth.users.id
  v_auth_user_id := user_id_from_profile_id(p_user_id);
  
  -- Super admin bypass (requires auth.users.id)
  IF v_auth_user_id IS NOT NULL AND is_super_admin(v_auth_user_id) THEN
    RETURN true;
  END IF;
  
  -- BU admin bypass
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  -- Check for explicit DENY override (takes precedence)
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    JOIN public.permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'deny'
      AND pc.key = p_permission_key
  ) THEN
    RETURN false;
  END IF;
  
  -- Check for explicit ALLOW override
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    JOIN public.permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
      AND pc.key = p_permission_key
  ) THEN
    RETURN true;
  END IF;
  
  -- Check V2 templates (ONLY source of truth now)
  RETURN EXISTS (
    SELECT 1
    FROM public.bu_user_permission_templates_v2 upt
    JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
    WHERE upt.user_id = p_user_id 
      AND upt.bu_id = p_bu_id
      AND pti.permission_key = p_permission_key
  );
END;
$function$;

COMMENT ON FUNCTION public.has_permission(uuid, uuid, text) IS 
  'V2-Only permission check. Receives profile_id, not auth.users.id. Checks templates and overrides.';

-- 2. Fix user_has_permission - V2 Only version
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1) Super admin tem acesso total
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2) BU admin tem acesso amplo na BU
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;

  -- 3) Check for explicit DENY override (takes precedence)
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    JOIN public.permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'deny'
      AND pc.key = p_permission_key
  ) THEN
    RETURN false;
  END IF;

  -- 4) Verificar override allow individual
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    JOIN public.permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
      AND pc.key = p_permission_key
  ) THEN
    RETURN true;
  END IF;

  -- 5) Verificar via V2 templates (ONLY source of truth)
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_templates_v2 upt
    JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
    WHERE upt.user_id = p_user_id 
      AND upt.bu_id = p_bu_id
      AND pti.permission_key = p_permission_key
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.user_has_permission(uuid, uuid, text) IS 
  'V2-Only permission check. Legacy wrapper - use has_permission() for new code.';