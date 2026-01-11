-- ============================================================
-- LIMPEZA: Remover tabela 'mentions' não utilizada
-- A tabela 'ticket_mentions' é a tabela canônica para menções
-- ============================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view mentions in their BU" ON public.mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;
DROP POLICY IF EXISTS "mentions_select" ON public.mentions;
DROP POLICY IF EXISTS "mentions_insert" ON public.mentions;

-- Drop the unused table
DROP TABLE IF EXISTS public.mentions;

-- Add comment documenting the removal
COMMENT ON TABLE public.ticket_mentions IS 'Canonical table for mentions in ticket messages. The old "mentions" table was deprecated and removed.';