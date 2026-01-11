-- ============================================================
-- WAVE 1: SECURITY FIXES - Audit Report 2026-01-11
-- ============================================================

-- 1. Recriar views com SECURITY INVOKER (P0 - Crítico)
-- ============================================================

-- 1.1 View: v_ai_agents_public
DROP VIEW IF EXISTS public.v_ai_agents_public;
CREATE VIEW public.v_ai_agents_public 
WITH (security_invoker = true) AS
SELECT 
    id,
    name,
    slug,
    description,
    scope,
    bu_id,
    is_active,
    output_format,
    created_at,
    updated_at
FROM ai_agents a
WHERE (
    is_platform_admin(auth.uid()) 
    OR ((scope = 'bu'::agent_scope) AND is_profile_bu_member(my_profile_id(), bu_id)) 
    OR ((scope = 'global'::agent_scope) AND (is_active = true))
);

-- Comentário de documentação
COMMENT ON VIEW public.v_ai_agents_public IS 'Public view for AI agents. Uses SECURITY INVOKER to respect RLS. Fixed in audit 2026-01-11.';

-- 1.2 View: v_profiles_directory
DROP VIEW IF EXISTS public.v_profiles_directory;
CREATE VIEW public.v_profiles_directory 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.email,
    p.work_email,
    p.photo_url,
    p.team_id,
    t.name AS team_name,
    p.job_title_id,
    jt.name AS job_title_name,
    p.employment_status,
    p.onboarding_completed,
    p.global_status,
    p.user_type,
    p.bu_id AS primary_bu_id,
    p.start_date,
    p.created_at,
    (EXISTS ( 
        SELECT 1
        FROM bu_user_memberships m
        WHERE ((m.profile_id = p.id) AND (m.deleted_at IS NULL))
    )) AS has_any_active_membership
FROM ((profiles p
    LEFT JOIN teams t ON ((p.team_id = t.id)))
    LEFT JOIN job_titles jt ON ((p.job_title_id = jt.id)))
WHERE (p.deleted_at IS NULL);

-- Comentário de documentação
COMMENT ON VIEW public.v_profiles_directory IS 'Profile directory view for user lookups. Uses SECURITY INVOKER to respect RLS. Fixed in audit 2026-01-11.';

-- 2. Corrigir função f_unaccent com search_path fixo (P0 - Crítico)
-- ============================================================
DROP FUNCTION IF EXISTS public.f_unaccent(text);
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public
AS $function$
  SELECT public.unaccent('public.unaccent', $1)
$function$;

-- Comentário de documentação
COMMENT ON FUNCTION public.f_unaccent(text) IS 'Unaccent helper function with fixed search_path. Fixed in audit 2026-01-11.';

-- 3. Documentar políticas WITH CHECK(true) como exceções válidas (audit/log tables)
-- ============================================================
-- As seguintes tabelas são append-only logs onde INSERT é permitido para autenticados:
-- - notification_template_versions (audit de templates)
-- - notification_template_audit_log (audit log)
-- - cron_execution_logs (logs de execução de cron)
-- - permission_audit_log (audit de permissões)
-- Estas exceções são ACEITAS conforme TCR para tabelas de audit/log.

COMMENT ON TABLE public.notification_template_versions IS 'Append-only audit table for notification template changes. WITH CHECK(true) is intentional for audit logs.';
COMMENT ON TABLE public.notification_template_audit_log IS 'Append-only audit log for notification templates. WITH CHECK(true) is intentional for audit logs.';
COMMENT ON TABLE public.cron_execution_logs IS 'Append-only log for cron executions. WITH CHECK(true) is intentional for system logs.';
COMMENT ON TABLE public.permission_audit_log IS 'Append-only audit log for permission changes. WITH CHECK(true) is intentional for audit logs.';