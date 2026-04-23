-- =============================================================================
-- QA Validation Script — Notificações de Projetos
-- =============================================================================
-- Uso: psql -f scripts/qa/validate-projects-notifications.sql
--
-- Valida a estrutura SQL da migration 20260423233016 (Notificações de Projetos).
-- Toda a lógica de fanout vive em triggers PostgreSQL — não há como cobrir via
-- Vitest mockado (mocks não disparam triggers). Por isso este script é a fonte
-- de verdade da cobertura automatizada do módulo.
--
-- Critério: todas as 7 asserções abaixo devem retornar `ok = true`.
-- =============================================================================

\echo '== CN-EVT: Eventos canônicos registrados =='
SELECT
  COUNT(*) FILTER (WHERE slug = 'project.status.changed')   = 1 AS evt_project_status_ok,
  COUNT(*) FILTER (WHERE slug = 'milestone.status.changed') = 1 AS evt_milestone_status_ok,
  COUNT(*) FILTER (WHERE slug = 'mention.created')          = 1 AS evt_mention_ok,
  bool_and(
    CASE
      WHEN slug IN ('project.status.changed','milestone.status.changed')
        THEN audience = 'internal' AND default_channels @> ARRAY['in_app','email']
      WHEN slug = 'mention.created'
        THEN audience = 'both' AND default_channels @> ARRAY['in_app','email']
    END
  ) AS audience_and_channels_ok
FROM public.notification_events
WHERE slug IN ('project.status.changed','milestone.status.changed','mention.created');

\echo ''
\echo '== CN-TPL: Templates de email globais ativos =='
SELECT
  COUNT(*) FILTER (WHERE event_slug = 'project.status.changed'   AND channel = 'email' AND is_active) = 1 AS tpl_project_ok,
  COUNT(*) FILTER (WHERE event_slug = 'milestone.status.changed' AND channel = 'email' AND is_active) = 1 AS tpl_milestone_ok,
  bool_and(subject_template ~ '\{\{project_name\}\}')      AS subject_has_project_name,
  bool_and(subject_template ~ '\{\{bu_name\}\}')           AS subject_has_bu_name,
  bool_and(body_template    ~ '\{\{actor_name\}\}')        AS body_has_actor_name
FROM public.notification_templates
WHERE event_slug IN ('project.status.changed','milestone.status.changed')
  AND bu_id IS NULL;

\echo ''
\echo '== CN-TRG: Triggers ativos (sem duplicado de mention) =='
SELECT
  bool_and(t.tgenabled <> 'D') AS triggers_enabled,
  COUNT(*) FILTER (WHERE t.tgname = 'trg_notify_project_status_changed')   = 1 AS trg_project_status_ok,
  COUNT(*) FILTER (WHERE t.tgname = 'trg_notify_milestone_status_changed') = 1 AS trg_milestone_status_ok,
  COUNT(*) FILTER (WHERE t.tgname = 'trg_notify_project_mention')          = 1 AS trg_project_mention_ok,
  COUNT(*) FILTER (WHERE t.tgname = 'trg_notify_ticket_mention')           = 1 AS trg_ticket_mention_ok,
  COUNT(*) FILTER (WHERE t.tgname = 'trg_notify_mention')                  = 0 AS trg_legacy_removed_ok
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname IN ('projects','project_milestones','mentions')
  AND NOT t.tgisinternal;

\echo ''
\echo '== CN-FANOUT: Função de fanout do projeto inclui owner + teams + watchers =='
WITH src AS (
  SELECT pg_get_functiondef('public.notify_project_status_changed'::regproc) AS def
)
SELECT
  def ~ 'project_teams'                                       AS includes_teams,
  def ~ 'mentions'                                            AS includes_watchers,
  def ~ 'pc\.deleted_at IS NULL'                              AS respects_soft_delete,
  def ~ 'IS DISTINCT FROM v_actor_auth_id'                    AS excludes_actor,
  def ~ 'ARRAY_AGG\(DISTINCT'                                 AS dedupes_recipients,
  def ~ 'IS NOT DISTINCT FROM NEW\.status'                    AS skips_when_no_change
FROM src;

\echo ''
\echo '== CN-FANOUT-MS: Função de fanout do milestone inclui owner do milestone =='
WITH src AS (
  SELECT pg_get_functiondef('public.notify_milestone_status_changed'::regproc) AS def
)
SELECT
  def ~ 'project_teams'                                       AS includes_teams,
  def ~ 'mentions'                                            AS includes_watchers,
  def ~ 'milestone_name'                                      AS includes_milestone_name,
  def ~ 'IS DISTINCT FROM v_actor_auth_id'                    AS excludes_actor,
  def ~ 'ARRAY_AGG\(DISTINCT'                                 AS dedupes_recipients
FROM src;

\echo ''
\echo '== CN-MENTION: Trigger de mention do projeto tem WHEN clause correta =='
SELECT
  pg_get_triggerdef(t.oid) ~ 'project_comment'  AS when_clause_ok
FROM pg_trigger t
WHERE t.tgname = 'trg_notify_project_mention';

\echo ''
\echo '== CN-INDEX: Índices de suporte ao fanout existem =='
SELECT
  COUNT(*) FILTER (WHERE indexname = 'idx_mentions_entity_lookup' OR indexdef ~ 'mentions.*entity_type.*entity_id') > 0 AS mentions_lookup_index_ok,
  COUNT(*) FILTER (WHERE indexname = 'idx_project_comments_project' OR indexdef ~ 'project_comments.*project_id') > 0 AS comments_project_index_ok
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename IN ('mentions','project_comments'));
