-- Fix has_permission function to not use deprecated resolve_permission_key
-- Since V1 was sunset, we use permission keys directly (no alias resolution needed)

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions text[];
BEGIN
  -- Super admin bypass
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- BU admin bypass
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  -- Check permissions from v1 groups (legacy, but still works)
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
  
  -- Also check v2 templates
  v_permissions := COALESCE(v_permissions, ARRAY[]::text[]) || (
    SELECT COALESCE(ARRAY_AGG(DISTINCT pti.permission_key), ARRAY[]::text[])
    FROM public.bu_user_permission_templates_v2 upt
    JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
    WHERE upt.user_id = p_user_id AND upt.bu_id = p_bu_id
  );
  
  RETURN p_permission_key = ANY(COALESCE(v_permissions, ARRAY[]::text[]));
END;
$$;