-- ============================================================================
-- QA: Validação de URLs em notificações (SSOT relativo)
-- ============================================================================
-- Verifica que:
-- 1. notification_outbox recente grava context_url como path relativo
-- 2. Triggers de notificação esperados existem e estão habilitados
-- 3. Templates ativos cobrem os events principais
--
-- Idempotente, somente leitura, <1s.
-- Ver: docs/qa/QA_EMAIL_CONTEXT_URL.md
-- ============================================================================

\echo '=== 1. SSOT: context_url no outbox deve ser RELATIVO ==='
SELECT
  COUNT(*) FILTER (WHERE payload->>'context_url' IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE payload->>'context_url' LIKE '/%') AS relative_count,
  COUNT(*) FILTER (WHERE payload->>'context_url' ~ '^https?://') AS absolute_count_VIOLATION,
  COUNT(*) AS total_last_7d
FROM public.notification_outbox
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Esperado: absolute_count_VIOLATION = 0
-- Se > 0: algum trigger ou edge function gravou URL absoluta no banco (anti-padrão).

\echo ''
\echo '=== 2. Triggers de notificação esperados ==='
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_notify_ticket_mention',
    'trg_notify_project_mention',
    'trg_notify_ticket_status_changed',
    'trg_notify_project_status_changed',
    'trg_notify_milestone_status_changed',
    'trg_notify_ticket_created',
    'trg_notify_ticket_assigned',
    'trg_notify_ticket_message_created'
  )
ORDER BY trigger_name;

\echo ''
\echo '=== 3. Templates de email ativos para events críticos ==='
SELECT
  event_slug,
  channel_slug,
  version,
  is_active,
  CASE
    WHEN body_template ~ '\{\{context_url\}\}' THEN 'YES'
    ELSE 'no'
  END AS uses_context_url,
  LEFT(subject_template, 60) AS subject_preview
FROM public.notification_templates
WHERE is_active = true
  AND channel_slug = 'email'
  AND event_slug IN (
    'mention.created',
    'ticket.status.changed',
    'ticket.created',
    'ticket.assigned',
    'ticket.message.created',
    'project.status.changed',
    'milestone.status.changed'
  )
ORDER BY event_slug, version DESC;

\echo ''
\echo '=== 4. Amostra de outbox recente (mention.created) ==='
SELECT
  id,
  event_slug,
  channel_slug,
  status,
  payload->>'context_url' AS context_url,
  CASE
    WHEN payload->>'context_url' LIKE '/%' THEN 'OK (relative)'
    WHEN payload->>'context_url' ~ '^https?://' THEN 'VIOLATION (absolute)'
    WHEN payload->>'context_url' IS NULL THEN '-'
    ELSE 'UNKNOWN'
  END AS verdict,
  created_at
FROM public.notification_outbox
WHERE event_slug = 'mention.created'
  AND channel_slug = 'email'
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '=== Done ==='
