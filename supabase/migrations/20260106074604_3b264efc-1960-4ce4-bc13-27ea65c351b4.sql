-- Security Hardening: Fix overly permissive RLS policies
-- PR 8: Restrict access to authenticated users with proper BU checks

-- ============= AI AGENTS =============
-- Require authentication for viewing global agents
DROP POLICY IF EXISTS "Users can view active global agents" ON public.ai_agents;
CREATE POLICY "Authenticated users can view active global agents"
  ON public.ai_agents FOR SELECT
  TO authenticated
  USING (scope = 'global' AND is_active = true);

-- ============= AI AGENT DOCUMENTS =============
-- Add BU membership check
DROP POLICY IF EXISTS "Users can view documents of active agents" ON public.ai_agent_documents;
CREATE POLICY "Users can view documents of agents they can access"
  ON public.ai_agent_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = ai_agent_documents.agent_id
        AND a.is_active = true
        AND (
          (a.scope = 'global')
          OR (a.scope = 'bu' AND user_has_bu_access(auth.uid(), a.bu_id))
        )
    )
  );

-- ============= PROFILES =============
-- Restrict to same-BU members only (keep cross-BU for platform admins)
DROP POLICY IF EXISTS "Users can view active profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their BU"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND employment_status IN ('active', 'vacation')
    AND (
      bu_id IN (SELECT get_user_bus(auth.uid()))
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= OKR ORG OBJECTIVES =============
DROP POLICY IF EXISTS "Users can view active org objectives" ON public.okr_org_objectives;
CREATE POLICY "BU members can view org objectives"
  ON public.okr_org_objectives FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= OKR ORG KEY RESULTS =============
DROP POLICY IF EXISTS "Users can view active org key results" ON public.okr_org_key_results;
CREATE POLICY "BU members can view org key results"
  ON public.okr_org_key_results FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= OKR TEAM OBJECTIVES =============
DROP POLICY IF EXISTS "Users can view active team objectives" ON public.okr_team_objectives;
CREATE POLICY "BU members can view team objectives"
  ON public.okr_team_objectives FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= OKR TEAM KEY RESULTS =============
DROP POLICY IF EXISTS "Users can view active team key results" ON public.okr_team_key_results;
CREATE POLICY "BU members can view team key results"
  ON public.okr_team_key_results FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= TEAMS =============
DROP POLICY IF EXISTS "Users can view active teams" ON public.teams;
CREATE POLICY "BU members can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= SQUADS =============
DROP POLICY IF EXISTS "Users can view active squads" ON public.squads;
CREATE POLICY "BU members can view squads"
  ON public.squads FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= SQUAD MEMBERSHIPS =============
DROP POLICY IF EXISTS "Users can view squad memberships" ON public.squad_memberships;
CREATE POLICY "BU members can view squad memberships"
  ON public.squad_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_memberships.squad_id
        AND s.deleted_at IS NULL
        AND (
          user_has_bu_access(auth.uid(), s.bu_id)
          OR is_platform_admin(auth.uid())
        )
    )
  );

-- ============= SQUAD TEAMS =============
DROP POLICY IF EXISTS "Users can view squad team relationships" ON public.squad_teams;
CREATE POLICY "BU members can view squad team relationships"
  ON public.squad_teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_teams.squad_id
        AND s.deleted_at IS NULL
        AND (
          user_has_bu_access(auth.uid(), s.bu_id)
          OR is_platform_admin(auth.uid())
        )
    )
  );

-- ============= ASSET INVENTORY =============
-- Restrict to BU members but keep anon access for QR code scans
DROP POLICY IF EXISTS "Anyone can view asset inventory public info" ON public.asset_inventory;
DROP POLICY IF EXISTS "Users can view asset inventory" ON public.asset_inventory;
CREATE POLICY "BU members can view asset inventory"
  ON public.asset_inventory FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- Keep minimal public access for QR code scans (only basic info, no serial numbers)
CREATE POLICY "Public can view asset by internal code"
  ON public.asset_inventory FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

-- ============= HUB INTEGRATIONS CATALOG =============
-- Use 'status' column instead of 'is_active'
DROP POLICY IF EXISTS "Authenticated users can view active integrations catalog" ON public.hub_integrations_catalog;
CREATE POLICY "Admins can view integrations catalog"
  ON public.hub_integrations_catalog FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND (
      is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.bu_user_memberships bum
        WHERE bum.user_id = auth.uid()
          AND bum.role_in_bu IN ('admin', 'super_admin')
      )
    )
  );

-- ============= KPI METRICS =============
DROP POLICY IF EXISTS "Users can view active KPI metrics" ON public.kpi_metrics;
CREATE POLICY "BU members can view KPI metrics"
  ON public.kpi_metrics FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- ============= KPI VALUES =============
DROP POLICY IF EXISTS "Users can view KPI values" ON public.kpi_values;
CREATE POLICY "BU members can view KPI values"
  ON public.kpi_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kpi_metrics km
      WHERE km.id = kpi_values.kpi_id
        AND km.deleted_at IS NULL
        AND (
          user_has_bu_access(auth.uid(), km.bu_id)
          OR is_platform_admin(auth.uid())
        )
    )
  );