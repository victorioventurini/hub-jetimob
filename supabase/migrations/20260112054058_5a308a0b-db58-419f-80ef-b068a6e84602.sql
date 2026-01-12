-- Fix the COALESCE to use valid enum value 'self' instead of 'own'
DROP FUNCTION IF EXISTS get_effective_permissions_v2(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_effective_permissions_v2(p_user_id uuid, p_bu_id uuid)
RETURNS TABLE(
  permission_key text,
  permission_id uuid,
  user_id uuid,
  bu_id uuid,
  module text,
  resource text,
  action text,
  scope text,
  source text,
  source_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id uuid;
  v_role text;
BEGIN
  -- p_user_id is profile_id, need to get auth user_id for membership check
  SELECT profiles.user_id INTO v_auth_user_id
  FROM profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if super_admin
  IF EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE bu_user_memberships.user_id = v_auth_user_id 
      AND role_in_bu = 'super_admin'
  ) THEN
    RETURN QUERY SELECT 
      '*'::text as permission_key,
      '00000000-0000-0000-0000-000000000000'::uuid as permission_id,
      p_user_id as user_id,
      p_bu_id as bu_id,
      '*'::text as module,
      '*'::text as resource,
      '*'::text as action,
      '*'::text as scope,
      'wildcard'::text as source,
      'super_admin'::text as source_name;
    RETURN;
  END IF;

  -- Check role in BU
  SELECT role_in_bu INTO v_role
  FROM bu_user_memberships
  WHERE bu_user_memberships.user_id = v_auth_user_id AND bu_user_memberships.bu_id = p_bu_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'admin' THEN
    RETURN QUERY SELECT 
      '*'::text as permission_key,
      '00000000-0000-0000-0000-000000000000'::uuid as permission_id,
      p_user_id as user_id,
      p_bu_id as bu_id,
      '*'::text as module,
      '*'::text as resource,
      '*'::text as action,
      '*'::text as scope,
      'wildcard'::text as source,
      'admin'::text as source_name;
    RETURN;
  END IF;

  -- Return V2 template permissions with full details from permission_catalog
  RETURN QUERY
  SELECT 
    pc.key as permission_key,
    pc.id as permission_id,
    p_user_id as user_id,
    p_bu_id as bu_id,
    pc.module as module,
    pc.resource as resource,
    pc.action as action,
    pc.scope::text as scope,
    'template_v2'::text as source,
    pt.name as source_name
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
  JOIN permission_catalog pc ON pc.key = ti.permission_key
  WHERE ut.bu_id = p_bu_id
    AND ut.user_id = p_user_id;

  -- Return override permissions with full details from permission_catalog
  RETURN QUERY
  SELECT 
    pc.key as permission_key,
    pc.id as permission_id,
    p_user_id as user_id,
    p_bu_id as bu_id,
    pc.module as module,
    pc.resource as resource,
    pc.action as action,
    pc.scope::text as scope,
    'override'::text as source,
    CASE o.effect WHEN 'allow' THEN '+override' ELSE '-override' END as source_name
  FROM bu_user_permission_overrides o
  JOIN permission_catalog pc ON pc.id = o.permission_id
  WHERE o.bu_id = p_bu_id
    AND o.user_id = p_user_id;

  RETURN;
END;
$function$;