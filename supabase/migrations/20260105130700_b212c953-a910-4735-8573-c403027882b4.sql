-- ================================================
-- RENAME is_admin_or_ceo TO is_platform_admin
-- Mantém a mesma lógica: super_admin OU admin
-- ================================================

-- 1. Criar nova função is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- 2. Atualizar TODAS as RLS policies para usar is_platform_admin

-- =============== CORE TABLES ===============

-- profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- teams
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- modules
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- metrics
DROP POLICY IF EXISTS "Admins can manage metrics" ON public.metrics;
CREATE POLICY "Admins can manage metrics"
  ON public.metrics FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- cycles
DROP POLICY IF EXISTS "Admins can manage cycles" ON public.cycles;
CREATE POLICY "Admins can manage cycles"
  ON public.cycles FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- user_team_memberships
DROP POLICY IF EXISTS "Admins can manage team memberships" ON public.user_team_memberships;
CREATE POLICY "Admins can manage team memberships"
  ON public.user_team_memberships FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- =============== OKR TABLES ===============

-- okr_org_objectives
DROP POLICY IF EXISTS "Admins can manage org objectives" ON public.okr_org_objectives;
CREATE POLICY "Admins can manage org objectives"
  ON public.okr_org_objectives FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_org_key_results
DROP POLICY IF EXISTS "Admins can manage org key results" ON public.okr_org_key_results;
CREATE POLICY "Admins can manage org key results"
  ON public.okr_org_key_results FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_team_objectives
DROP POLICY IF EXISTS "Admins can manage all team objectives" ON public.okr_team_objectives;
CREATE POLICY "Admins can manage all team objectives"
  ON public.okr_team_objectives FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_team_key_results
DROP POLICY IF EXISTS "Admins can manage all team key results" ON public.okr_team_key_results;
CREATE POLICY "Admins can manage all team key results"
  ON public.okr_team_key_results FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_checkins
DROP POLICY IF EXISTS "Admins can manage checkins" ON public.okr_checkins;
CREATE POLICY "Admins can manage checkins"
  ON public.okr_checkins FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_dependencies
DROP POLICY IF EXISTS "Admins can manage dependencies" ON public.okr_dependencies;
CREATE POLICY "Admins can manage dependencies"
  ON public.okr_dependencies FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_reports_config
DROP POLICY IF EXISTS "Admins can manage reports config" ON public.okr_reports_config;
CREATE POLICY "Admins can manage reports config"
  ON public.okr_reports_config FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- okr_notifications_log
DROP POLICY IF EXISTS "Admins can view notifications log" ON public.okr_notifications_log;
CREATE POLICY "Admins can view notifications log"
  ON public.okr_notifications_log FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- okr_audit_log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.okr_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.okr_audit_log FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- =============== KPI TABLES ===============

-- kpi_metrics
DROP POLICY IF EXISTS "Admins can manage all KPIs" ON public.kpi_metrics;
CREATE POLICY "Admins can manage all KPIs"
  ON public.kpi_metrics FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- kpi_values
DROP POLICY IF EXISTS "Admins can manage all KPI values" ON public.kpi_values;
CREATE POLICY "Admins can manage all KPI values"
  ON public.kpi_values FOR ALL
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "KPI owners can insert values" ON public.kpi_values;
CREATE POLICY "KPI owners can insert values"
  ON public.kpi_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kpi_metrics km
      WHERE km.id = kpi_values.kpi_id
      AND (km.owner_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
  );

-- =============== BU TABLES ===============

-- bu_units
DROP POLICY IF EXISTS "Global admins can manage all BUs" ON public.bu_units;
CREATE POLICY "Global admins can manage all BUs"
  ON public.bu_units FOR ALL
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view BUs they belong to" ON public.bu_units;
CREATE POLICY "Users can view BUs they belong to"
  ON public.bu_units FOR SELECT
  USING (
    public.user_has_bu_access(auth.uid(), id) OR public.is_platform_admin(auth.uid())
  );

-- bu_user_memberships
DROP POLICY IF EXISTS "Global admins can manage all memberships" ON public.bu_user_memberships;
CREATE POLICY "Global admins can manage all memberships"
  ON public.bu_user_memberships FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- bu_module_configs
DROP POLICY IF EXISTS "Global admins can manage module configs" ON public.bu_module_configs;
CREATE POLICY "Global admins can manage module configs"
  ON public.bu_module_configs FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- bu_integrations_config
DROP POLICY IF EXISTS "Users can view their BU integration configs" ON public.bu_integrations_config;
CREATE POLICY "Users can view their BU integration configs"
  ON public.bu_integrations_config FOR SELECT
  USING (public.user_has_bu_access(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "BU admins can manage their BU integration configs" ON public.bu_integrations_config;
CREATE POLICY "BU admins can manage their BU integration configs"
  ON public.bu_integrations_config FOR ALL
  USING (public.is_bu_admin(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

-- bu_ia_config
DROP POLICY IF EXISTS "Users can view their BU IA config" ON public.bu_ia_config;
CREATE POLICY "Users can view their BU IA config"
  ON public.bu_ia_config FOR SELECT
  USING (public.user_has_bu_access(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "BU admins can manage their BU IA config" ON public.bu_ia_config;
CREATE POLICY "BU admins can manage their BU IA config"
  ON public.bu_ia_config FOR ALL
  USING (public.is_bu_admin(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

-- bu_agent_activations
DROP POLICY IF EXISTS "Users can view their BU agent activations" ON public.bu_agent_activations;
CREATE POLICY "Users can view their BU agent activations"
  ON public.bu_agent_activations FOR SELECT
  USING (public.user_has_bu_access(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "BU admins can manage their BU agent activations" ON public.bu_agent_activations;
CREATE POLICY "BU admins can manage their BU agent activations"
  ON public.bu_agent_activations FOR ALL
  USING (public.is_bu_admin(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid()));

-- =============== INTEGRATIONS TABLES ===============

-- hub_integrations_catalog
DROP POLICY IF EXISTS "Admins can manage integrations catalog" ON public.hub_integrations_catalog;
CREATE POLICY "Admins can manage integrations catalog"
  ON public.hub_integrations_catalog FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- hub_integrations_global_config
DROP POLICY IF EXISTS "Admins can view global configs" ON public.hub_integrations_global_config;
CREATE POLICY "Admins can view global configs"
  ON public.hub_integrations_global_config FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage global configs" ON public.hub_integrations_global_config;
CREATE POLICY "Admins can manage global configs"
  ON public.hub_integrations_global_config FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- =============== AI AGENTS TABLES ===============

-- ai_agents
DROP POLICY IF EXISTS "Admins can manage global agents" ON public.ai_agents;
CREATE POLICY "Admins can manage global agents"
  ON public.ai_agents FOR ALL
  USING (scope = 'global' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "BU admins can manage their BU agents" ON public.ai_agents;
CREATE POLICY "BU admins can manage their BU agents"
  ON public.ai_agents FOR ALL
  USING (scope = 'bu' AND (public.is_bu_admin(auth.uid(), bu_id) OR public.is_platform_admin(auth.uid())));

-- ai_agent_documents
DROP POLICY IF EXISTS "Admins can manage all agent documents" ON public.ai_agent_documents;
CREATE POLICY "Admins can manage all agent documents"
  ON public.ai_agent_documents FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- ai_agent_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.ai_agent_logs;
CREATE POLICY "Admins can view all logs"
  ON public.ai_agent_logs FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- =============== SQUADS TABLES ===============

-- squads
DROP POLICY IF EXISTS "Admins can manage squads" ON public.squads;
CREATE POLICY "Admins can manage squads"
  ON public.squads FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- squad_teams
DROP POLICY IF EXISTS "Admins can manage squad teams" ON public.squad_teams;
CREATE POLICY "Admins can manage squad teams"
  ON public.squad_teams FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- squad_memberships
DROP POLICY IF EXISTS "Admins can manage squad memberships" ON public.squad_memberships;
CREATE POLICY "Admins can manage squad memberships"
  ON public.squad_memberships FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- =============== STORAGE POLICIES ===============

-- bu-assets bucket
DROP POLICY IF EXISTS "Admins can upload BU assets" ON storage.objects;
CREATE POLICY "Admins can upload BU assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bu-assets' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update BU assets" ON storage.objects;
CREATE POLICY "Admins can update BU assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bu-assets' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete BU assets" ON storage.objects;
CREATE POLICY "Admins can delete BU assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bu-assets' AND public.is_platform_admin(auth.uid()));

-- agent-documents bucket
DROP POLICY IF EXISTS "Admins can upload agent documents" ON storage.objects;
CREATE POLICY "Admins can upload agent documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agent-documents' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view agent documents" ON storage.objects;
CREATE POLICY "Admins can view agent documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-documents' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete agent documents" ON storage.objects;
CREATE POLICY "Admins can delete agent documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agent-documents' AND public.is_platform_admin(auth.uid()));

-- 3. Remover função antiga
DROP FUNCTION IF EXISTS public.is_admin_or_ceo(uuid);