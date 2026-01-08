
-- ============================================================
-- AUTOMATION: Auto-assign base V2 template on membership creation
-- TCR v2.12.0 compliant
-- ============================================================

-- 1) Create canonical function: ensure_default_v2_template_for_membership
-- SECURITY DEFINER to bypass RLS, called only by trigger
CREATE OR REPLACE FUNCTION public.ensure_default_v2_template_for_membership(
  p_auth_user_id uuid,
  p_bu_id uuid,
  p_role_in_bu text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_template_id uuid;
BEGIN
  -- 1) Resolve profile_id from auth user_id
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = p_auth_user_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    -- Profile not yet created, skip (handle_new_user may not have run yet)
    -- This is safe: if profile doesn't exist, user can't access anything anyway
    RETURN;
  END IF;

  -- 2) Choose base template based on role
  -- Currently only collaborator_base_v2 exists (no external_contact_base_v2)
  -- Future: add external_contact_base_v2 check when role = 'external'
  SELECT id INTO v_template_id
  FROM public.permission_templates_v2
  WHERE slug = 'collaborator_base_v2'
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE WARNING 'BASE_TEMPLATE_NOT_FOUND: collaborator_base_v2 missing';
    RETURN;
  END IF;

  -- 3) Assign base template v2 (idempotent via ON CONFLICT)
  INSERT INTO public.bu_user_permission_templates_v2 (bu_id, user_id, template_id, created_at)
  VALUES (p_bu_id, v_profile_id, v_template_id, now())
  ON CONFLICT DO NOTHING;

  -- 4) Track in permission_migrations (upsert)
  INSERT INTO public.permission_migrations (
    id, bu_id, user_id, status, migrated_at, migrated_by, notes, created_at
  )
  VALUES (
    gen_random_uuid(), 
    p_bu_id, 
    v_profile_id, 
    'migrated', 
    now(), 
    NULL,  -- system-triggered, no user
    'auto-assigned collaborator_base_v2 on membership create',
    now()
  )
  ON CONFLICT (bu_id, user_id) DO UPDATE SET
    status = 'migrated',
    migrated_at = COALESCE(public.permission_migrations.migrated_at, EXCLUDED.migrated_at),
    notes = EXCLUDED.notes,
    updated_at = now();
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.ensure_default_v2_template_for_membership(uuid, uuid, text) IS 
'Auto-assigns base V2 permission template when user gains BU membership. 
Called by trigger, not exposed as RPC. SECURITY DEFINER bypasses RLS.';

-- 2) Create trigger wrapper function
CREATE OR REPLACE FUNCTION public.trg_handle_membership_created_assign_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Call canonical function with auth user_id, bu_id, and role
  PERFORM public.ensure_default_v2_template_for_membership(
    NEW.user_id,  -- auth.users.id
    NEW.bu_id,
    NEW.role_in_bu::text
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_handle_membership_created_assign_v2() IS 
'Trigger function: assigns base V2 template on bu_user_memberships INSERT.';

-- 3) Create trigger AFTER INSERT on bu_user_memberships
DROP TRIGGER IF EXISTS trg_auto_assign_base_template_v2 ON public.bu_user_memberships;

CREATE TRIGGER trg_auto_assign_base_template_v2
AFTER INSERT ON public.bu_user_memberships
FOR EACH ROW
EXECUTE FUNCTION public.trg_handle_membership_created_assign_v2();

-- 4) BACKFILL: Assign base template to existing memberships without V2 template
DO $$
DECLARE
  r RECORD;
  v_backfill_count int := 0;
BEGIN
  -- Find memberships without any V2 template assignment
  FOR r IN 
    SELECT m.user_id as auth_user_id, m.bu_id, m.role_in_bu::text as role
    FROM public.bu_user_memberships m
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.bu_user_permission_templates_v2 t
      JOIN public.profiles p ON p.id = t.user_id
      WHERE t.bu_id = m.bu_id AND p.user_id = m.user_id
    )
  LOOP
    PERFORM public.ensure_default_v2_template_for_membership(
      r.auth_user_id,
      r.bu_id,
      r.role
    );
    v_backfill_count := v_backfill_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: % memberships processed', v_backfill_count;
END;
$$;
