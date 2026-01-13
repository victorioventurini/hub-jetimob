-- Migration: Convert operational views to SECURITY INVOKER
-- Administrative/reporting views remain as SECURITY DEFINER (appropriate for aggregated admin data)

-- Operational views - convert to SECURITY INVOKER
ALTER VIEW public.v_objective_health SET (security_invoker = true);
ALTER VIEW public.v_okr_insights_active SET (security_invoker = true);
ALTER VIEW public.v_partner_services SET (security_invoker = true);
ALTER VIEW public.v_pending_checkins SET (security_invoker = true);
ALTER VIEW public.v_shared_okrs_summary SET (security_invoker = true);
ALTER VIEW public.v_team_contributed_okrs SET (security_invoker = true);

-- Observability views - follow established pattern from SLO views
ALTER VIEW public.v_notification_delivery_health SET (security_invoker = true);
ALTER VIEW public.v_notification_failures SET (security_invoker = true);

-- Note: The following administrative views intentionally remain SECURITY DEFINER:
-- v_perf_indexes_report - admin-only database performance data
-- v_permission_risk_report - admin-only permission audit data
-- v_permissions_without_explanation - admin-only permission audit data
-- v_users_without_templates - admin-only user audit data
-- v_bu_id_null_report - admin-only data integrity report
-- These are appropriate as SECURITY DEFINER because:
-- 1. They aggregate data for admin purposes only
-- 2. Access is controlled via application-level permissions
-- 3. RLS on base tables still protects row-level access