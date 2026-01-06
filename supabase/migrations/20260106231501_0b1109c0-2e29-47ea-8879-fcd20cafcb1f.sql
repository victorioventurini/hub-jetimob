-- =====================================================
-- BU SCOPE v2: HARDENING - Never NULL + RLS
-- =====================================================

-- =====================================================
-- 1. FIX current_bu_id() TO NEVER RETURN NULL
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
    RAISE EXCEPTION 'NO_BU_CONTEXT: User is not authenticated';
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
  
  IF v_bu_id IS NOT NULL THEN
    RETURN v_bu_id;
  END IF;
  
  SELECT bu_id INTO v_bu_id
  FROM public.bu_user_memberships
  WHERE user_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_bu_id IS NOT NULL THEN
    RETURN v_bu_id;
  END IF;
  
  RAISE EXCEPTION 'NO_BU_CONTEXT: User % has no BU membership', v_user_id;
END;
$$;

COMMENT ON FUNCTION public.current_bu_id() IS 
'Returns current BU ID. NEVER returns NULL - raises NO_BU_CONTEXT if no valid BU.';

-- =====================================================
-- 2. SAFE BU CHECK HELPER (for RLS - no throw)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_current_bu(p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_bu uuid;
BEGIN
  IF is_platform_admin(auth.uid()) THEN
    RETURN true;
  END IF;
  
  BEGIN
    v_current_bu := current_bu_id();
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  
  RETURN p_bu_id = v_current_bu;
END;
$$;

-- =====================================================
-- 3. BACKFILL REPORT VIEW (only tables that have bu_id)
-- =====================================================
DROP VIEW IF EXISTS public.v_bu_id_null_report;
CREATE VIEW public.v_bu_id_null_report AS
SELECT 'okr_org_objectives' as table_name, 
       COUNT(*) FILTER (WHERE bu_id IS NULL) as count_null,
       COUNT(*) as total
FROM public.okr_org_objectives
UNION ALL
SELECT 'okr_org_key_results', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.okr_org_key_results
UNION ALL
SELECT 'okr_team_objectives', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.okr_team_objectives
UNION ALL
SELECT 'okr_team_key_results', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.okr_team_key_results
UNION ALL
SELECT 'okr_checkins', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.okr_checkins
UNION ALL
SELECT 'okr_initiatives', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.okr_initiatives
UNION ALL
SELECT 'teams', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.teams
UNION ALL
SELECT 'squads', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.squads
UNION ALL
SELECT 'asset_inventory', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.asset_inventory
UNION ALL
SELECT 'tickets', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.tickets
UNION ALL
SELECT 'kpi_metrics', COUNT(*) FILTER (WHERE bu_id IS NULL), COUNT(*)
FROM public.kpi_metrics;

-- =====================================================
-- 4. RLS HARDENING: OKR Tables
-- =====================================================
DROP POLICY IF EXISTS "BU members can view org objectives" ON public.okr_org_objectives;
CREATE POLICY "BU members can view org objectives"
  ON public.okr_org_objectives FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert org objectives" ON public.okr_org_objectives;
CREATE POLICY "BU members can insert org objectives"
  ON public.okr_org_objectives FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update org objectives" ON public.okr_org_objectives;
CREATE POLICY "BU members can update org objectives"
  ON public.okr_org_objectives FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can delete org objectives" ON public.okr_org_objectives;
CREATE POLICY "BU members can delete org objectives"
  ON public.okr_org_objectives FOR DELETE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view org KRs" ON public.okr_org_key_results;
CREATE POLICY "BU members can view org KRs"
  ON public.okr_org_key_results FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert org KRs" ON public.okr_org_key_results;
CREATE POLICY "BU members can insert org KRs"
  ON public.okr_org_key_results FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update org KRs" ON public.okr_org_key_results;
CREATE POLICY "BU members can update org KRs"
  ON public.okr_org_key_results FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view team objectives" ON public.okr_team_objectives;
CREATE POLICY "BU members can view team objectives"
  ON public.okr_team_objectives FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert team objectives" ON public.okr_team_objectives;
CREATE POLICY "BU members can insert team objectives"
  ON public.okr_team_objectives FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update team objectives" ON public.okr_team_objectives;
CREATE POLICY "BU members can update team objectives"
  ON public.okr_team_objectives FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view team KRs" ON public.okr_team_key_results;
CREATE POLICY "BU members can view team KRs"
  ON public.okr_team_key_results FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert team KRs" ON public.okr_team_key_results;
CREATE POLICY "BU members can insert team KRs"
  ON public.okr_team_key_results FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update team KRs" ON public.okr_team_key_results;
CREATE POLICY "BU members can update team KRs"
  ON public.okr_team_key_results FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view initiatives" ON public.okr_initiatives;
CREATE POLICY "BU members can view initiatives"
  ON public.okr_initiatives FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert initiatives" ON public.okr_initiatives;
CREATE POLICY "BU members can insert initiatives"
  ON public.okr_initiatives FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update initiatives" ON public.okr_initiatives;
CREATE POLICY "BU members can update initiatives"
  ON public.okr_initiatives FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view checkins" ON public.okr_checkins;
CREATE POLICY "BU members can view checkins"
  ON public.okr_checkins FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert checkins" ON public.okr_checkins;
CREATE POLICY "BU members can insert checkins"
  ON public.okr_checkins FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

-- =====================================================
-- 5. RLS HARDENING: Teams
-- =====================================================
DROP POLICY IF EXISTS "BU members can view teams" ON public.teams;
CREATE POLICY "BU members can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert teams" ON public.teams;
CREATE POLICY "BU members can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update teams" ON public.teams;
CREATE POLICY "BU members can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view squads" ON public.squads;
CREATE POLICY "BU members can view squads"
  ON public.squads FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert squads" ON public.squads;
CREATE POLICY "BU members can insert squads"
  ON public.squads FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

-- =====================================================
-- 6. RLS HARDENING: Assets
-- =====================================================
DROP POLICY IF EXISTS "BU members can view assets" ON public.asset_inventory;
CREATE POLICY "BU members can view assets"
  ON public.asset_inventory FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert assets" ON public.asset_inventory;
CREATE POLICY "BU members can insert assets"
  ON public.asset_inventory FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update assets" ON public.asset_inventory;
CREATE POLICY "BU members can update assets"
  ON public.asset_inventory FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view asset movements" ON public.asset_movements;
CREATE POLICY "BU members can view asset movements"
  ON public.asset_movements FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert asset movements" ON public.asset_movements;
CREATE POLICY "BU members can insert asset movements"
  ON public.asset_movements FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view keyrings" ON public.asset_keyrings;
CREATE POLICY "BU members can view keyrings"
  ON public.asset_keyrings FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert keyrings" ON public.asset_keyrings;
CREATE POLICY "BU members can insert keyrings"
  ON public.asset_keyrings FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view categories" ON public.asset_categories;
CREATE POLICY "BU members can view categories"
  ON public.asset_categories FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert categories" ON public.asset_categories;
CREATE POLICY "BU members can insert categories"
  ON public.asset_categories FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

-- =====================================================
-- 7. RLS HARDENING: Tickets
-- =====================================================
DROP POLICY IF EXISTS "BU members can view tickets" ON public.tickets;
CREATE POLICY "BU members can view tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert tickets" ON public.tickets;
CREATE POLICY "BU members can insert tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update tickets" ON public.tickets;
CREATE POLICY "BU members can update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can view ticket categories" ON public.ticket_categories;
CREATE POLICY "BU members can view ticket categories"
  ON public.ticket_categories FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert ticket categories" ON public.ticket_categories;
CREATE POLICY "BU members can insert ticket categories"
  ON public.ticket_categories FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

-- =====================================================
-- 8. RLS HARDENING: KPIs
-- =====================================================
DROP POLICY IF EXISTS "BU members can view KPIs" ON public.kpi_metrics;
CREATE POLICY "BU members can view KPIs"
  ON public.kpi_metrics FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can insert KPIs" ON public.kpi_metrics;
CREATE POLICY "BU members can insert KPIs"
  ON public.kpi_metrics FOR INSERT TO authenticated
  WITH CHECK (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));

DROP POLICY IF EXISTS "BU members can update KPIs" ON public.kpi_metrics;
CREATE POLICY "BU members can update KPIs"
  ON public.kpi_metrics FOR UPDATE TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));