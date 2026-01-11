-- ============================================================
-- MIGRATION: Sistema Global de Menções
-- 1. Remove ticket_mentions (tabela vazia/legado)
-- 2. Adiciona índices de performance na tabela mentions
-- ============================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view ticket mentions in their BU" ON public.ticket_mentions;
DROP POLICY IF EXISTS "Users can create ticket mentions" ON public.ticket_mentions;
DROP POLICY IF EXISTS "ticket_mentions_select_policy" ON public.ticket_mentions;
DROP POLICY IF EXISTS "ticket_mentions_insert_policy" ON public.ticket_mentions;

-- Drop the unused table
DROP TABLE IF EXISTS public.ticket_mentions;

-- Add performance indexes to mentions table
CREATE INDEX IF NOT EXISTS idx_mentions_entity 
  ON public.mentions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user 
  ON public.mentions(mentioned_user_id) 
  WHERE mentioned_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_contact 
  ON public.mentions(mentioned_contact_id) 
  WHERE mentioned_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentions_bu_id
  ON public.mentions(bu_id);

CREATE INDEX IF NOT EXISTS idx_mentions_created_at
  ON public.mentions(created_at DESC);

-- Add comment documenting the cleanup
COMMENT ON TABLE public.mentions IS 'Global mentions table for all modules (tickets, OKRs, etc). Supports internal users (mentioned_user_id) and external contacts (mentioned_contact_id). Check constraint ensures exactly one target per mention.';