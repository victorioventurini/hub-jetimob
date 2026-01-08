-- Wave 7: Sunset V1 - Freeze legacy tables and create migration tracking
-- ========================================================================

-- 1. DEPRECATION COMMENTS ON V1 TABLES
-- ------------------------------------
COMMENT ON TABLE public.permission_groups IS '@deprecated — Replaced by permission_templates_v2 in Wave 6. READ-ONLY since Wave 7. Will be dropped in Wave 8/9.';
COMMENT ON TABLE public.permission_group_permissions IS '@deprecated — Replaced by permission_template_items_v2 in Wave 6. READ-ONLY since Wave 7. Will be dropped in Wave 8/9.';
COMMENT ON TABLE public.bu_permission_group_configs IS '@deprecated — V1 group configs. READ-ONLY since Wave 7. Will be dropped in Wave 8/9.';
COMMENT ON TABLE public.bu_user_permission_groups IS '@deprecated — Replaced by bu_user_permission_templates_v2 in Wave 6. READ-ONLY since Wave 7. Will be dropped in Wave 8/9.';

-- 2. CREATE MIGRATION TRACKING TABLE
-- -----------------------------------
CREATE TABLE IF NOT EXISTS public.permission_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'migrated', 'verified')),
  v1_groups_snapshot jsonb DEFAULT '[]',
  v2_templates_applied jsonb DEFAULT '[]',
  migrated_at timestamptz,
  migrated_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bu_id, user_id)
);

-- Enable RLS
ALTER TABLE public.permission_migrations ENABLE ROW LEVEL SECURITY;

-- RLS: Admin BU or super_admin can manage
CREATE POLICY "Admin can manage permission_migrations"
  ON public.permission_migrations
  FOR ALL
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bu_user_memberships m
      WHERE m.bu_id = permission_migrations.bu_id
        AND m.user_id = auth.uid()
        AND m.role_in_bu = 'admin'
    )
  );

-- 3. FREEZE V1 TABLES WITH TRIGGERS (DENY WRITE)
-- -----------------------------------------------

-- Function to block writes on deprecated V1 tables
CREATE OR REPLACE FUNCTION public.block_v1_writes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only super_admin can still write (for emergency fixes)
  IF public.is_platform_admin(auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  RAISE EXCEPTION 'V1_DEPRECATED_READ_ONLY: This table is deprecated since Wave 7. Use V2 templates instead.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply freeze trigger to permission_groups (INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_block_permission_groups_write ON public.permission_groups;
CREATE TRIGGER trg_block_permission_groups_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.block_v1_writes();

-- Apply freeze trigger to permission_group_permissions
DROP TRIGGER IF EXISTS trg_block_permission_group_permissions_write ON public.permission_group_permissions;
CREATE TRIGGER trg_block_permission_group_permissions_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.permission_group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.block_v1_writes();

-- Apply freeze trigger to bu_permission_group_configs
DROP TRIGGER IF EXISTS trg_block_bu_permission_group_configs_write ON public.bu_permission_group_configs;
CREATE TRIGGER trg_block_bu_permission_group_configs_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.bu_permission_group_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.block_v1_writes();

-- Apply freeze trigger to bu_user_permission_groups
DROP TRIGGER IF EXISTS trg_block_bu_user_permission_groups_write ON public.bu_user_permission_groups;
CREATE TRIGGER trg_block_bu_user_permission_groups_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.bu_user_permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.block_v1_writes();

-- 4. ADD LEGACY KEY USAGE LOGGING (for audit)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.log_legacy_key_usage(p_old_key text, p_context text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO public.app_error_logs (
    module,
    action,
    error_code,
    message,
    metadata
  ) VALUES (
    'permissions',
    'legacy_key_resolution',
    'LEGACY_KEY_USED',
    format('Legacy permission key used: %s', p_old_key),
    jsonb_build_object(
      'old_key', p_old_key,
      'context', p_context,
      'timestamp', now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RPC: GET MIGRATION STATUS FOR BU
-- ------------------------------------
CREATE OR REPLACE FUNCTION public.get_bu_migration_status(p_bu_id uuid)
RETURNS TABLE (
  total_users bigint,
  migrated_users bigint,
  verified_users bigint,
  not_started_users bigint,
  migration_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(DISTINCT p.id) as total,
      COUNT(DISTINCT pm.user_id) FILTER (WHERE pm.status = 'migrated' OR pm.status = 'verified') as migrated,
      COUNT(DISTINCT pm.user_id) FILTER (WHERE pm.status = 'verified') as verified
    FROM public.profiles p
    LEFT JOIN public.permission_migrations pm ON pm.user_id = p.id AND pm.bu_id = p_bu_id
    WHERE p.bu_id = p_bu_id
      AND p.deleted_at IS NULL
  )
  SELECT 
    uc.total,
    uc.migrated,
    uc.verified,
    uc.total - uc.migrated as not_started,
    CASE WHEN uc.total > 0 
      THEN ROUND((uc.migrated::numeric / uc.total::numeric) * 100, 2)
      ELSE 0 
    END as migration_percentage
  FROM user_counts uc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RPC: MARK USER AS MIGRATED
-- ------------------------------
CREATE OR REPLACE FUNCTION public.mark_user_migrated(
  p_bu_id uuid,
  p_user_id uuid,
  p_v1_snapshot jsonb DEFAULT '[]',
  p_v2_templates jsonb DEFAULT '[]',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_migration_id uuid;
  v_current_user uuid := auth.uid();
BEGIN
  INSERT INTO public.permission_migrations (
    bu_id,
    user_id,
    status,
    v1_groups_snapshot,
    v2_templates_applied,
    migrated_at,
    migrated_by,
    notes
  ) VALUES (
    p_bu_id,
    p_user_id,
    'migrated',
    p_v1_snapshot,
    p_v2_templates,
    now(),
    v_current_user,
    p_notes
  )
  ON CONFLICT (bu_id, user_id) DO UPDATE SET
    status = 'migrated',
    v1_groups_snapshot = EXCLUDED.v1_groups_snapshot,
    v2_templates_applied = EXCLUDED.v2_templates_applied,
    migrated_at = now(),
    migrated_by = v_current_user,
    notes = COALESCE(EXCLUDED.notes, permission_migrations.notes),
    updated_at = now()
  RETURNING id INTO v_migration_id;
  
  RETURN v_migration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. RPC: VERIFY USER MIGRATION
-- ------------------------------
CREATE OR REPLACE FUNCTION public.verify_user_migration(
  p_bu_id uuid,
  p_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_current_user uuid := auth.uid();
BEGIN
  UPDATE public.permission_migrations
  SET 
    status = 'verified',
    verified_at = now(),
    verified_by = v_current_user,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE bu_id = p_bu_id 
    AND user_id = p_user_id
    AND status = 'migrated';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;