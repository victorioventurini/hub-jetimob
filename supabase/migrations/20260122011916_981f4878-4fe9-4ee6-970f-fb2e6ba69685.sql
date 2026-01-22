-- ============================================================
-- FIX: Remove duplicate trigger and fix function referencing non-existent column
-- ============================================================

-- 1. Drop the BROKEN trigger (uses updated_at which doesn't exist)
DROP TRIGGER IF EXISTS trg_auto_add_ticket_mention_as_participant ON public.mentions;
DROP FUNCTION IF EXISTS public.auto_add_ticket_mention_as_participant();

-- 2. The correct trigger trg_auto_add_mention_as_participant already exists 
--    and uses ON CONFLICT DO NOTHING (which works without updated_at)

-- 3. Verify: now only trg_auto_add_mention_as_participant and trg_notify_mention remain