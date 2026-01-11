-- Performance Wave P3: Convert SECURITY DEFINER views to SECURITY INVOKER
-- This ensures views respect the RLS policies of the querying user

-- Note: We're setting security_invoker = on for views that were created with SECURITY DEFINER
-- This is the recommended approach for multi-tenant applications

-- v_pending_checkins
ALTER VIEW IF EXISTS public.v_pending_checkins SET (security_invoker = on);

-- v_bu_all_profiles_admin
ALTER VIEW IF EXISTS public.v_bu_all_profiles_admin SET (security_invoker = on);

-- v_profiles_directory
ALTER VIEW IF EXISTS public.v_profiles_directory SET (security_invoker = on);

-- v_ai_agents_public
ALTER VIEW IF EXISTS public.v_ai_agents_public SET (security_invoker = on);

-- v_okr_org_objectives_with_krs
ALTER VIEW IF EXISTS public.v_okr_org_objectives_with_krs SET (security_invoker = on);

-- v_okr_team_objectives_with_krs
ALTER VIEW IF EXISTS public.v_okr_team_objectives_with_krs SET (security_invoker = on);

-- v_team_contribution_summary
ALTER VIEW IF EXISTS public.v_team_contribution_summary SET (security_invoker = on);

-- v_checkin_summary
ALTER VIEW IF EXISTS public.v_checkin_summary SET (security_invoker = on);

-- v_org_objective_progress
ALTER VIEW IF EXISTS public.v_org_objective_progress SET (security_invoker = on);

-- v_team_objective_progress
ALTER VIEW IF EXISTS public.v_team_objective_progress SET (security_invoker = on);

-- v_kr_health_status
ALTER VIEW IF EXISTS public.v_kr_health_status SET (security_invoker = on);