-- ==========================================
-- WAVE 9: FINAL V1 DECOMMISSION & V2 HARDENING
-- ==========================================
-- This migration:
-- 1. Drops permission_key_aliases table (no more backward compatibility)
-- 2. Drops legacy functions (resolve_permission_key, log_legacy_key_usage, block_v1_writes)
-- 3. Creates users_without_v2_permissions view (guardrail)
-- 4. Simplifies get_my_permissions to V2-only (no alias resolution)
-- ==========================================

-- 1. DROP ALIASES TABLE (no more backward compatibility)
DROP TABLE IF EXISTS permission_key_aliases CASCADE;

-- 2. DROP LEGACY FUNCTIONS
DROP FUNCTION IF EXISTS resolve_permission_key(text) CASCADE;
DROP FUNCTION IF EXISTS log_legacy_key_usage(text, text) CASCADE;
DROP FUNCTION IF EXISTS block_v1_writes() CASCADE;

-- 3. DROP LEGACY RPC functions if they exist
DROP FUNCTION IF EXISTS get_effective_permissions_preview(uuid, uuid, text) CASCADE;

-- 4. CREATE GUARDRAIL VIEW: users without V2 permissions
-- Should always return 0 rows in a healthy system
CREATE OR REPLACE VIEW public.users_without_v2_permissions AS
SELECT 
  m.id as membership_id,
  m.bu_id,
  m.user_id as auth_user_id,
  p.id as profile_id,
  p.display_name,
  p.work_email,
  b.name as bu_name
FROM bu_user_memberships m
JOIN profiles p ON p.user_id = m.user_id
JOIN bu_units b ON b.id = m.bu_id
WHERE NOT EXISTS (
  SELECT 1 
  FROM bu_user_permission_templates_v2 t2
  WHERE t2.user_id = p.id 
    AND t2.bu_id = m.bu_id
);

COMMENT ON VIEW users_without_v2_permissions IS 'Guardrail view: lists users with BU membership but no V2 permission templates. Should return 0 rows.';

-- 5. RECREATE get_my_permissions as V2-ONLY (simplified, no aliases)
CREATE OR REPLACE FUNCTION get_my_permissions(p_bu_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_role text;
  v_is_super_admin boolean := false;
  v_permissions text[] := '{}';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '{}';
  END IF;

  -- Get profile_id
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN '{}';
  END IF;

  -- Check if super_admin (global wildcard)
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE user_id = v_user_id 
      AND role_in_bu = 'super_admin'
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN ARRAY['*'];
  END IF;

  -- Check BU membership and role
  SELECT role_in_bu INTO v_role
  FROM bu_user_memberships
  WHERE user_id = v_user_id AND bu_id = p_bu_id
  LIMIT 1;

  IF v_role IS NULL THEN
    -- No membership in this BU
    RETURN '{}';
  END IF;

  -- Admin in BU = wildcard for that BU
  IF v_role = 'admin' THEN
    RETURN ARRAY['*'];
  END IF;

  -- Collect permissions from V2 templates ONLY
  SELECT COALESCE(array_agg(DISTINCT ti.permission_key), '{}')
  INTO v_permissions
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
  WHERE ut.bu_id = p_bu_id
    AND ut.user_id = v_profile_id;

  -- Add allowed overrides
  SELECT COALESCE(array_agg(DISTINCT pc.key), '{}') || v_permissions
  INTO v_permissions
  FROM bu_user_permission_overrides o
  JOIN permission_catalog pc ON pc.id = o.permission_id
  WHERE o.bu_id = p_bu_id
    AND o.user_id = v_profile_id
    AND o.effect = 'allow';

  -- Remove denied overrides
  SELECT COALESCE(
    array_agg(DISTINCT p)
    FILTER (WHERE p IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM bu_user_permission_overrides o2
      JOIN permission_catalog pc2 ON pc2.id = o2.permission_id
      WHERE o2.bu_id = p_bu_id
        AND o2.user_id = v_profile_id
        AND o2.effect = 'deny'
        AND pc2.key = p
    )),
    '{}'
  )
  INTO v_permissions
  FROM unnest(v_permissions) p;

  RETURN v_permissions;
END;
$$;

COMMENT ON FUNCTION get_my_permissions(uuid) IS 'V2-only: Returns permission keys for current user in specified BU. No V1 compatibility, no aliases.';

-- 6. CREATE V2-only effective permissions function
CREATE OR REPLACE FUNCTION get_effective_permissions_v2(p_user_id uuid, p_bu_id uuid)
RETURNS TABLE(
  permission_key text,
  source text,
  source_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_auth_user_id uuid;
  v_role text;
BEGIN
  -- p_user_id is profile_id, need to get auth user_id for membership check
  SELECT user_id INTO v_auth_user_id
  FROM profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if super_admin
  IF EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE user_id = v_auth_user_id 
      AND role_in_bu = 'super_admin'
  ) THEN
    RETURN QUERY SELECT '*'::text, 'wildcard'::text, 'super_admin'::text;
    RETURN;
  END IF;

  -- Check role in BU
  SELECT role_in_bu INTO v_role
  FROM bu_user_memberships
  WHERE user_id = v_auth_user_id AND bu_id = p_bu_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'admin' THEN
    RETURN QUERY SELECT '*'::text, 'wildcard'::text, 'admin'::text;
    RETURN;
  END IF;

  -- Return V2 template permissions
  RETURN QUERY
  SELECT 
    ti.permission_key,
    'template_v2'::text as source,
    pt.name as source_name
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
  WHERE ut.bu_id = p_bu_id
    AND ut.user_id = p_user_id;

  -- Return override permissions
  RETURN QUERY
  SELECT 
    pc.key as permission_key,
    'override'::text as source,
    CASE o.effect WHEN 'allow' THEN '+override' ELSE '-override' END as source_name
  FROM bu_user_permission_overrides o
  JOIN permission_catalog pc ON pc.id = o.permission_id
  WHERE o.bu_id = p_bu_id
    AND o.user_id = p_user_id;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_effective_permissions_v2(uuid, uuid) IS 'V2-only: Returns effective permissions with source info for a user in a BU.';

-- 7. Clean up permission_migrations table (remove any V1 references in notes)
UPDATE permission_migrations
SET notes = REPLACE(notes, 'V1', 'legacy')
WHERE notes LIKE '%V1%';

-- 8. Verify no V1 tables remain
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('permission_groups', 'permission_group_permissions', 
                     'bu_user_permission_groups', 'bu_permission_group_configs',
                     'permission_key_aliases');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'WAVE9_INCOMPLETE: % V1/legacy tables still exist', v_count;
  END IF;
END;
$$;

-- 9. Add index for performance on guardrail view queries
CREATE INDEX IF NOT EXISTS idx_bu_user_permission_templates_v2_user_bu 
ON bu_user_permission_templates_v2(user_id, bu_id);

-- 10. Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'WAVE9_COMPLETE: V1 fully decommissioned. V2-only mode active.';
END;
$$;