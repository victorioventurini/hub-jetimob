-- =============================================================================
-- WAVE 6: Populate V2 Permission Templates and Auto-Assign to Team Leaders
-- =============================================================================

-- 1. Populate OKRs: Visualização v2 template
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, unnest(ARRAY[
  'okrs.view:bu',
  'okrs.cycle.read:bu',
  'okrs.org_objective.read:bu',
  'okrs.org_kr.read:bu',
  'okrs.team_objective.read:team_tree',
  'okrs.team_kr.read:team_tree',
  'okrs.initiative.read:bu',
  'okrs.checkin.read:bu'
])
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_view_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;

-- 2. Populate OKRs: Operador v2 template (for team leaders)
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, unnest(ARRAY[
  'okrs.view:bu',
  'okrs.cycle.read:bu',
  'okrs.org_objective.read:bu',
  'okrs.org_kr.read:bu',
  'okrs.team_objective.read:team_tree',
  'okrs.team_objective.create:team',
  'okrs.team_objective.update:self_or_owner',
  'okrs.team_kr.read:team_tree',
  'okrs.team_kr.create:team',
  'okrs.team_kr.update:self_or_owner',
  'okrs.initiative.read:bu',
  'okrs.initiative.create:team',
  'okrs.initiative.update:self_or_owner',
  'okrs.checkin.read:bu',
  'okrs.checkin.create:self'
])
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_operate_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;

-- 3. Populate OKRs: Admin v2 template (full access)
INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT pt.id, unnest(ARRAY[
  'okrs.view:bu',
  'okrs.cycle.read:bu',
  'okrs.cycle.create:bu',
  'okrs.cycle.update:bu',
  'okrs.cycle.delete:bu',
  'okrs.org_objective.read:bu',
  'okrs.org_objective.create:bu',
  'okrs.org_objective.update:bu',
  'okrs.org_objective.delete:bu',
  'okrs.org_kr.read:bu',
  'okrs.org_kr.create:bu',
  'okrs.org_kr.update:bu',
  'okrs.org_kr.delete:bu',
  'okrs.team_objective.read:bu',
  'okrs.team_objective.create:bu',
  'okrs.team_objective.update:bu',
  'okrs.team_objective.delete:bu',
  'okrs.team_kr.read:bu',
  'okrs.team_kr.create:bu',
  'okrs.team_kr.update:bu',
  'okrs.team_kr.delete:bu',
  'okrs.initiative.read:bu',
  'okrs.initiative.create:bu',
  'okrs.initiative.update:bu',
  'okrs.initiative.delete:bu',
  'okrs.checkin.read:bu',
  'okrs.checkin.create:bu',
  'okrs.checkin.update:bu',
  'okrs.checkin.delete:bu',
  'okrs.settings.manage:bu'
])
FROM permission_templates_v2 pt
WHERE pt.slug = 'okrs_admin_v2'
ON CONFLICT (template_id, permission_key) DO NOTHING;

-- 4. Assign OKRs: Operador v2 to ALL existing team leaders
-- FIXED: user_id column references profiles.id, NOT profiles.user_id
INSERT INTO bu_user_permission_templates_v2 (bu_id, user_id, template_id)
SELECT DISTINCT
  t.bu_id,
  t.leader_user_id,  -- This is actually profiles.id
  pt.id
FROM teams t
CROSS JOIN permission_templates_v2 pt
WHERE pt.slug = 'okrs_operate_v2'
  AND t.status = 'active'
  AND t.leader_user_id IS NOT NULL
  AND t.deleted_at IS NULL
  -- Ensure the leader exists in profiles
  AND EXISTS (SELECT 1 FROM profiles WHERE id = t.leader_user_id)
ON CONFLICT (bu_id, user_id, template_id) DO NOTHING;

-- 5. Create trigger function for auto-assigning permissions to new team leaders
CREATE OR REPLACE FUNCTION public.auto_assign_leader_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Only proceed if leader_user_id was set or changed
  IF NEW.leader_user_id IS NOT NULL AND 
     (OLD IS NULL OR OLD.leader_user_id IS DISTINCT FROM NEW.leader_user_id) THEN
    
    -- Get the OKRs Operador v2 template
    SELECT id INTO v_template_id
    FROM permission_templates_v2
    WHERE slug = 'okrs_operate_v2';
    
    -- Only proceed if we found the template
    IF v_template_id IS NOT NULL THEN
      -- leader_user_id is actually profiles.id, so use it directly
      INSERT INTO bu_user_permission_templates_v2 (bu_id, user_id, template_id)
      VALUES (NEW.bu_id, NEW.leader_user_id, v_template_id)
      ON CONFLICT (bu_id, user_id, template_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger on teams table
DROP TRIGGER IF EXISTS trigger_auto_assign_leader_permissions ON teams;
CREATE TRIGGER trigger_auto_assign_leader_permissions
AFTER INSERT OR UPDATE OF leader_user_id ON teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_leader_permissions();