-- =====================================================
-- BU SCOPE ENFORCEMENT: DB-LEVEL GUARDS
-- =====================================================

-- =====================================================
-- 1. Helper function to get current BU from user's default membership
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_bu_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_bu_id uuid;
  v_header_bu_id text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  BEGIN
    v_header_bu_id := current_setting('request.headers', true)::json->>'x-current-bu-id';
    IF v_header_bu_id IS NOT NULL AND v_header_bu_id != '' THEN
      SELECT bu_id INTO v_bu_id
      FROM public.bu_user_memberships
      WHERE user_id = v_user_id AND bu_id = v_header_bu_id::uuid
      LIMIT 1;
      
      IF v_bu_id IS NOT NULL THEN
        RETURN v_bu_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  SELECT bu_id INTO v_bu_id
  FROM public.bu_user_memberships
  WHERE user_id = v_user_id AND is_default = true
  LIMIT 1;
  
  IF v_bu_id IS NULL THEN
    SELECT bu_id INTO v_bu_id
    FROM public.bu_user_memberships
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  RETURN v_bu_id;
END;
$$;

-- =====================================================
-- 2. Validation function for BU scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.assert_bu_scope(p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_bu uuid;
BEGIN
  IF p_bu_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_BU_ID: bu_id cannot be null for this operation';
  END IF;
  
  v_current_bu := current_bu_id();
  
  IF is_platform_admin(auth.uid()) THEN
    RETURN true;
  END IF;
  
  IF v_current_bu IS NULL THEN
    RAISE EXCEPTION 'NO_BU_CONTEXT: User has no BU context available';
  END IF;
  
  IF p_bu_id != v_current_bu THEN
    RAISE EXCEPTION 'BU_SCOPE_VIOLATION: Cannot operate on data from a different BU';
  END IF;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 3. Generic trigger function to enforce BU scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_bu_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_bu uuid;
BEGIN
  IF is_platform_admin(auth.uid()) THEN
    IF NEW.bu_id IS NULL THEN
      NEW.bu_id := current_bu_id();
    END IF;
    RETURN NEW;
  END IF;
  
  v_current_bu := current_bu_id();
  
  IF NEW.bu_id IS NULL THEN
    IF v_current_bu IS NULL THEN
      RAISE EXCEPTION 'MISSING_BU_ID: Cannot insert/update without bu_id and no BU context available';
    END IF;
    NEW.bu_id := v_current_bu;
  ELSE
    IF v_current_bu IS NOT NULL AND NEW.bu_id != v_current_bu THEN
      RAISE EXCEPTION 'BU_SCOPE_VIOLATION: Cannot operate on data from a different BU';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. Add bu_id to tables that don't have it
-- =====================================================
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS bu_id uuid REFERENCES public.bu_units(id);
ALTER TABLE public.okr_checkins ADD COLUMN IF NOT EXISTS bu_id uuid REFERENCES public.bu_units(id);

-- =====================================================
-- 5. Apply triggers to OKR tables (that have bu_id)
-- =====================================================
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_org_objectives ON public.okr_org_objectives;
CREATE TRIGGER trg_enforce_bu_scope_okr_org_objectives
  BEFORE INSERT OR UPDATE ON public.okr_org_objectives
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_org_key_results ON public.okr_org_key_results;
CREATE TRIGGER trg_enforce_bu_scope_okr_org_key_results
  BEFORE INSERT OR UPDATE ON public.okr_org_key_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_team_objectives ON public.okr_team_objectives;
CREATE TRIGGER trg_enforce_bu_scope_okr_team_objectives
  BEFORE INSERT OR UPDATE ON public.okr_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_team_key_results ON public.okr_team_key_results;
CREATE TRIGGER trg_enforce_bu_scope_okr_team_key_results
  BEFORE INSERT OR UPDATE ON public.okr_team_key_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_initiatives ON public.okr_initiatives;
CREATE TRIGGER trg_enforce_bu_scope_okr_initiatives
  BEFORE INSERT OR UPDATE ON public.okr_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_checkins ON public.okr_checkins;
CREATE TRIGGER trg_enforce_bu_scope_okr_checkins
  BEFORE INSERT OR UPDATE ON public.okr_checkins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_cycles ON public.cycles;
CREATE TRIGGER trg_enforce_bu_scope_cycles
  BEFORE INSERT OR UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_okr_insights ON public.okr_insights;
CREATE TRIGGER trg_enforce_bu_scope_okr_insights
  BEFORE INSERT OR UPDATE ON public.okr_insights
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- =====================================================
-- 6. Apply triggers to Asset tables
-- =====================================================
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_inventory ON public.asset_inventory;
CREATE TRIGGER trg_enforce_bu_scope_asset_inventory
  BEFORE INSERT OR UPDATE ON public.asset_inventory
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_movements ON public.asset_movements;
CREATE TRIGGER trg_enforce_bu_scope_asset_movements
  BEFORE INSERT OR UPDATE ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_keyrings ON public.asset_keyrings;
CREATE TRIGGER trg_enforce_bu_scope_asset_keyrings
  BEFORE INSERT OR UPDATE ON public.asset_keyrings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_key_movements ON public.asset_key_movements;
CREATE TRIGGER trg_enforce_bu_scope_asset_key_movements
  BEFORE INSERT OR UPDATE ON public.asset_key_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_gift_items ON public.asset_gift_items;
CREATE TRIGGER trg_enforce_bu_scope_asset_gift_items
  BEFORE INSERT OR UPDATE ON public.asset_gift_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_gift_batches ON public.asset_gift_batches;
CREATE TRIGGER trg_enforce_bu_scope_asset_gift_batches
  BEFORE INSERT OR UPDATE ON public.asset_gift_batches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_gift_movements ON public.asset_gift_movements;
CREATE TRIGGER trg_enforce_bu_scope_asset_gift_movements
  BEFORE INSERT OR UPDATE ON public.asset_gift_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_categories ON public.asset_categories;
CREATE TRIGGER trg_enforce_bu_scope_asset_categories
  BEFORE INSERT OR UPDATE ON public.asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_clavicularies ON public.asset_clavicularies;
CREATE TRIGGER trg_enforce_bu_scope_asset_clavicularies
  BEFORE INSERT OR UPDATE ON public.asset_clavicularies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_groups ON public.asset_groups;
CREATE TRIGGER trg_enforce_bu_scope_asset_groups
  BEFORE INSERT OR UPDATE ON public.asset_groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_group_items ON public.asset_group_items;
CREATE TRIGGER trg_enforce_bu_scope_asset_group_items
  BEFORE INSERT OR UPDATE ON public.asset_group_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_asset_permissions ON public.asset_permissions;
CREATE TRIGGER trg_enforce_bu_scope_asset_permissions
  BEFORE INSERT OR UPDATE ON public.asset_permissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- =====================================================
-- 7. Apply triggers to Teams tables
-- =====================================================
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_teams ON public.teams;
CREATE TRIGGER trg_enforce_bu_scope_teams
  BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_squads ON public.squads;
CREATE TRIGGER trg_enforce_bu_scope_squads
  BEFORE INSERT OR UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- =====================================================
-- 8. Apply triggers to Tickets tables
-- =====================================================
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_tickets ON public.tickets;
CREATE TRIGGER trg_enforce_bu_scope_tickets
  BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_ticket_messages ON public.ticket_messages;
CREATE TRIGGER trg_enforce_bu_scope_ticket_messages
  BEFORE INSERT OR UPDATE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_ticket_attachments ON public.ticket_attachments;
CREATE TRIGGER trg_enforce_bu_scope_ticket_attachments
  BEFORE INSERT OR UPDATE ON public.ticket_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_ticket_categories ON public.ticket_categories;
CREATE TRIGGER trg_enforce_bu_scope_ticket_categories
  BEFORE INSERT OR UPDATE ON public.ticket_categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_ticket_subcategories ON public.ticket_subcategories;
CREATE TRIGGER trg_enforce_bu_scope_ticket_subcategories
  BEFORE INSERT OR UPDATE ON public.ticket_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_ticket_routing_rules ON public.ticket_routing_rules;
CREATE TRIGGER trg_enforce_bu_scope_ticket_routing_rules
  BEFORE INSERT OR UPDATE ON public.ticket_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- =====================================================
-- 9. Apply triggers to KPI tables
-- =====================================================
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_kpi_metrics ON public.kpi_metrics;
CREATE TRIGGER trg_enforce_bu_scope_kpi_metrics
  BEFORE INSERT OR UPDATE ON public.kpi_metrics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_enforce_bu_scope_kpi_values ON public.kpi_values;
CREATE TRIGGER trg_enforce_bu_scope_kpi_values
  BEFORE INSERT OR UPDATE ON public.kpi_values
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- =====================================================
-- 10. Backfill: Fix existing records with null bu_id
-- =====================================================
UPDATE public.okr_org_key_results kr
SET bu_id = obj.bu_id
FROM public.okr_org_objectives obj
WHERE kr.org_objective_id = obj.id
  AND kr.bu_id IS NULL
  AND obj.bu_id IS NOT NULL;

UPDATE public.okr_team_key_results kr
SET bu_id = obj.bu_id
FROM public.okr_team_objectives obj
WHERE kr.team_objective_id = obj.id
  AND kr.bu_id IS NULL
  AND obj.bu_id IS NOT NULL;

UPDATE public.okr_team_objectives obj
SET bu_id = t.bu_id
FROM public.teams t
WHERE obj.team_id = t.id
  AND obj.bu_id IS NULL
  AND t.bu_id IS NOT NULL;

UPDATE public.okr_initiatives i
SET bu_id = kr.bu_id
FROM public.okr_team_key_results kr
WHERE i.kr_id = kr.id
  AND i.bu_id IS NULL
  AND kr.bu_id IS NOT NULL;

-- Backfill okr_checkins from team_id -> teams.bu_id
UPDATE public.okr_checkins c
SET bu_id = t.bu_id
FROM public.teams t
WHERE c.team_id = t.id
  AND c.bu_id IS NULL
  AND t.bu_id IS NOT NULL;

-- =====================================================
-- 11. Observability: Error logging table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  bu_id uuid,
  module text NOT NULL,
  action text NOT NULL,
  error_code text NOT NULL,
  message text NOT NULL,
  stack text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all error logs" ON public.app_error_logs;
CREATE POLICY "Platform admins can view all error logs"
  ON public.app_error_logs FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can log errors" ON public.app_error_logs;
CREATE POLICY "Users can log errors"
  ON public.app_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);