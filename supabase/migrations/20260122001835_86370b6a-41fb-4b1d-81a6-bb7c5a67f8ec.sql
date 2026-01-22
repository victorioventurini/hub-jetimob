-- =====================================================
-- FIX: ON CONFLICT (dedupe_key) requires a non-partial unique index
-- 
-- Symptom: ticket_messages INSERT fails with 42P10
-- Root cause: emit_notification_event() does
--   ON CONFLICT (dedupe_key) DO NOTHING
-- but idx_notification_outbox_dedupe_key was a PARTIAL unique index
--   WHERE dedupe_key IS NOT NULL
-- which cannot be inferred without an inference WHERE clause.
--
-- Solution: make the unique index non-partial.
-- Unique indexes allow multiple NULLs, so this remains safe.
-- =====================================================

DROP INDEX IF EXISTS public.idx_notification_outbox_dedupe_key;

CREATE UNIQUE INDEX idx_notification_outbox_dedupe_key
  ON public.notification_outbox (dedupe_key);
